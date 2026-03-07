import { UnexpectedCodePathError } from 'helpful-errors';
import OpenAI from 'openai';

import type { BrainArch1Context } from '@src/domain.objects/BrainArch1/BrainArch1Context';
import { BrainArch1MemoryTokenUsage } from '@src/domain.objects/BrainArch1/BrainArch1MemoryTokenUsage';
import { BrainArch1SessionMessage } from '@src/domain.objects/BrainArch1/BrainArch1SessionMessage';
import { BrainArch1ToolCall } from '@src/domain.objects/BrainArch1/BrainArch1ToolCall';
import type { BrainArch1ToolDefinition } from '@src/domain.objects/BrainArch1/BrainArch1ToolDefinition';

/**
 * .what = context required for qwen api calls
 * .why = enables dependency injection of qwen-specific config
 */
export interface ContextQwen {
  qwen: {
    auth: { key: string; url: string };
    llm: { model: string };
  };
}

/**
 * .what = converts bhrain tool definitions to openai-compatible tool format
 * .why = qwen uses openai-compatible api
 */
const toQwenTools = (
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
    },
  }));
};

/**
 * .what = converts bhrain messages to openai-compatible message format
 * .why = qwen uses openai-compatible api
 */
const toQwenMessages = (
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
 * .what = converts qwen response to bhrain message format
 * .why = normalizes qwen's response to our domain model
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
 * .what = generates a response from qwen api (openai-compatible)
 * .why = enables brain to use qwen as its llm atom
 *
 * .note = qwen uses dashscope's openai-compatible endpoint
 */
const generate = async (
  input: {
    messages: BrainArch1SessionMessage[];
    tools: BrainArch1ToolDefinition[];
    maxTokens?: number;
  },
  context: ContextQwen & { log: BrainArch1Context['log'] },
): Promise<{
  message: BrainArch1SessionMessage;
  tokenUsage: BrainArch1MemoryTokenUsage;
}> => {
  // instantiate client with qwen endpoint
  const client = new OpenAI({
    apiKey: context.qwen.auth.key,
    baseURL: context.qwen.auth.url,
  });

  // prepare request
  const qwenMessages = toQwenMessages(input.messages);
  const qwenTools =
    input.tools.length > 0 ? toQwenTools(input.tools) : undefined;

  // make api call
  const response = await client.chat.completions.create({
    model: context.qwen.llm.model,
    max_tokens: input.maxTokens ?? 8192,
    messages: qwenMessages,
    tools: qwenTools,
  });

  // validate response
  const choice = response.choices[0];
  if (!choice) {
    throw new UnexpectedCodePathError('no choice in qwen response', {
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

export const sdkQwen = {
  generate,
};
