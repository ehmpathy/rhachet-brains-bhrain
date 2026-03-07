import type { ContextLogTrail } from 'as-procedure';
import { UnexpectedCodePathError } from 'helpful-errors';
import OpenAI from 'openai';
import type { ChatModel } from 'openai/resources/index';

import type { BrainArch1Context } from '@src/domain.objects/BrainArch1/BrainArch1Context';
import { BrainArch1MemoryTokenUsage } from '@src/domain.objects/BrainArch1/BrainArch1MemoryTokenUsage';
import { BrainArch1SessionMessage } from '@src/domain.objects/BrainArch1/BrainArch1SessionMessage';
import { BrainArch1ToolCall } from '@src/domain.objects/BrainArch1/BrainArch1ToolCall';
import type { BrainArch1ToolDefinition } from '@src/domain.objects/BrainArch1/BrainArch1ToolDefinition';

export interface ContextOpenAI {
  openai: {
    auth: { key: string; url?: string };
    llm: {
      model: ChatModel;
      output: 'words' | 'json';
    };
  };
}

const imagine = async (
  input: string,
  context: ContextOpenAI & ContextLogTrail,
): Promise<string> => {
  const openai = new OpenAI({
    apiKey: context.openai.auth.key,
  });
  const response = await openai.chat.completions.create({
    response_format:
      context.openai.llm.output === 'json'
        ? { type: 'json_object' }
        : undefined,
    messages: [
      {
        role: 'user',
        content: input,
      },
    ],
    model: context.openai.llm.model,
  });
  if (!response.choices[0])
    throw new UnexpectedCodePathError(
      'at least one response choice should be provided',
      { response },
    );
  if (response.choices.length > 1)
    throw new UnexpectedCodePathError(
      'more than one response.choice provided',
      { response },
    );
  if (!response.choices[0].message.content)
    throw new UnexpectedCodePathError('no content provided in response', {
      response,
    });
  const content = response.choices[0].message.content.trim();
  const stripped =
    content.startsWith('```') && content.endsWith('```') // strip ```{ext} automatically if its just the exterior surround
      ? content.split('\n').slice(1, -1).join('\n').trim()
      : content;
  return stripped;
};

/**
 * .what = converts bhrain tool definitions to openai tool format
 * .why = openai has its own function calling schema format
 */
const toOpenAiTools = (
  tools: BrainArch1ToolDefinition[],
): OpenAI.Chat.Completions.ChatCompletionTool[] => {
  return tools.map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object' as const,
        properties: tool.schema.input.properties,
        required: tool.schema.input.required,
      },
      strict: tool.strict,
    },
  }));
};

/**
 * .what = converts bhrain messages to openai message format
 * .why = openai has its own message structure
 */
const toOpenAiMessages = (
  messages: BrainArch1SessionMessage[],
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] => {
  return messages.map((msg) => {
    // handle tool result messages
    if (msg.role === 'tool' && msg.toolCallId) {
      return {
        role: 'tool' as const,
        tool_call_id: msg.toolCallId,
        content: msg.content ?? '',
      };
    }

    // handle assistant messages with tool calls
    if (msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length > 0) {
      return {
        role: 'assistant' as const,
        content: msg.content,
        tool_calls: msg.toolCalls.map((call) => ({
          id: call.id,
          type: 'function' as const,
          function: {
            name: call.name,
            arguments: JSON.stringify(call.input),
          },
        })),
      };
    }

    // handle regular messages
    if (msg.role === 'system') {
      return { role: 'system' as const, content: msg.content ?? '' };
    }
    if (msg.role === 'user') {
      return { role: 'user' as const, content: msg.content ?? '' };
    }
    return { role: 'assistant' as const, content: msg.content ?? '' };
  });
};

/**
 * .what = converts openai response to bhrain message format
 * .why = normalizes openai's response to our domain model
 */
const toBrainArch1Message = (
  choice: OpenAI.Chat.Completions.ChatCompletion.Choice,
): BrainArch1SessionMessage => {
  const toolCalls: BrainArch1ToolCall[] = [];

  if (choice.message.tool_calls) {
    for (const tc of choice.message.tool_calls) {
      toolCalls.push(
        new BrainArch1ToolCall({
          id: tc.id,
          name: tc.function.name,
          input: JSON.parse(tc.function.arguments || '{}'),
        }),
      );
    }
  }

  return new BrainArch1SessionMessage({
    role: 'assistant',
    content: choice.message.content,
    toolCalls: toolCalls.length > 0 ? toolCalls : null,
    toolCallId: null,
  });
};

/**
 * .what = generates a response from openai api with tool support
 * .why = enables brain to use openai as its llm atom
 */
const generate = async (
  input: {
    messages: BrainArch1SessionMessage[];
    tools: BrainArch1ToolDefinition[];
    maxTokens?: number;
  },
  context: {
    openai: { auth: { key: string; url?: string }; llm: { model: string } };
  } & {
    log: BrainArch1Context['log'];
  },
): Promise<{
  message: BrainArch1SessionMessage;
  tokenUsage: BrainArch1MemoryTokenUsage;
}> => {
  // instantiate client
  const client = new OpenAI({
    apiKey: context.openai.auth.key,
    baseURL: context.openai.auth.url,
  });

  // prepare request
  const openaiMessages = toOpenAiMessages(input.messages);
  const openaiTools =
    input.tools.length > 0 ? toOpenAiTools(input.tools) : undefined;

  // make api call
  const response = await client.chat.completions.create({
    model: context.openai.llm.model,
    max_tokens: input.maxTokens ?? 8192,
    messages: openaiMessages,
    tools: openaiTools,
  });

  // validate response
  const choice = response.choices[0];
  if (!choice) {
    throw new UnexpectedCodePathError('no choice in openai response', {
      response,
    });
  }

  // convert to bhrain format
  const message = toBrainArch1Message(choice);
  const tokenUsage = new BrainArch1MemoryTokenUsage({
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
    totalTokens: response.usage?.total_tokens ?? 0,
    cacheReadTokens: null,
    cacheWriteTokens: null,
  });

  return { message, tokenUsage };
};

export const sdkOpenAi = {
  imagine,
  generate,
};
