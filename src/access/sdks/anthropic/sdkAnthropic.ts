import Anthropic from '@anthropic-ai/sdk';
import { UnexpectedCodePathError } from 'helpful-errors';

import type { BrainArch1Context } from '@src/domain.objects/BrainArch1/BrainArch1Context';
import { BrainArch1MemoryTokenUsage } from '@src/domain.objects/BrainArch1/BrainArch1MemoryTokenUsage';
import { BrainArch1SessionMessage } from '@src/domain.objects/BrainArch1/BrainArch1SessionMessage';
import { BrainArch1ToolCall } from '@src/domain.objects/BrainArch1/BrainArch1ToolCall';
import type { BrainArch1ToolDefinition } from '@src/domain.objects/BrainArch1/BrainArch1ToolDefinition';

/**
 * .what = context required for anthropic api calls
 * .why = enables dependency injection of anthropic-specific config
 */
export interface ContextAnthropic {
  anthropic: {
    auth: { key: string; url?: string };
    llm: { model: string };
  };
}

/**
 * .what = converts bhrain tool definitions to anthropic tool format
 * .why = anthropic has its own tool schema format
 */
const toAnthropicTools = (
  tools: BrainArch1ToolDefinition[],
): Anthropic.Tool[] => {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: {
      type: 'object' as const,
      properties: tool.schema.input.properties,
      required: tool.schema.input.required,
    },
  }));
};

/**
 * .what = converts bhrain messages to anthropic message format
 * .why = anthropic has its own message structure with content blocks
 */
const toAnthropicMessages = (
  messages: BrainArch1SessionMessage[],
): Anthropic.MessageParam[] => {
  return messages
    .filter((m) => m.role !== 'system') // system handled separately
    .map((msg) => {
      // handle tool result messages
      if (msg.role === 'tool' && msg.toolCallId) {
        return {
          role: 'user' as const,
          content: [
            {
              type: 'tool_result' as const,
              tool_use_id: msg.toolCallId,
              content: msg.content ?? '',
            },
          ],
        };
      }

      // handle assistant messages with tool calls
      if (
        msg.role === 'assistant' &&
        msg.toolCalls &&
        msg.toolCalls.length > 0
      ) {
        const content: Anthropic.ContentBlockParam[] = [];
        if (msg.content) {
          content.push({ type: 'text' as const, text: msg.content });
        }
        for (const call of msg.toolCalls) {
          content.push({
            type: 'tool_use' as const,
            id: call.id,
            name: call.name,
            input: call.input,
          });
        }
        return { role: 'assistant' as const, content };
      }

      // handle regular messages
      return {
        role: msg.role === 'user' ? ('user' as const) : ('assistant' as const),
        content: msg.content ?? '',
      };
    });
};

/**
 * .what = extracts system prompt from messages
 * .why = anthropic handles system prompt separately from messages
 */
const extractSystemPrompt = (
  messages: BrainArch1SessionMessage[],
): string | undefined => {
  const systemMsg = messages.find((m) => m.role === 'system');
  return systemMsg?.content ?? undefined;
};

/**
 * .what = converts anthropic response to bhrain message format
 * .why = normalizes anthropic's response to our domain model
 */
const toBrainArch1Message = (
  response: Anthropic.Message,
): BrainArch1SessionMessage => {
  let textContent: string | null = null;
  const toolCalls: BrainArch1ToolCall[] = [];

  for (const block of response.content) {
    if (block.type === 'text') {
      textContent = block.text;
    } else if (block.type === 'tool_use') {
      toolCalls.push(
        new BrainArch1ToolCall({
          id: block.id,
          name: block.name,
          input: block.input as Record<string, unknown>,
        }),
      );
    }
  }

  return new BrainArch1SessionMessage({
    role: 'assistant',
    content: textContent,
    toolCalls: toolCalls.length > 0 ? toolCalls : null,
    toolCallId: null,
  });
};

/**
 * .what = generates a response from anthropic claude api
 * .why = enables brain to use anthropic as its llm atom
 */
const generate = async (
  input: {
    messages: BrainArch1SessionMessage[];
    tools: BrainArch1ToolDefinition[];
    maxTokens?: number;
  },
  context: ContextAnthropic & { log: BrainArch1Context['log'] },
): Promise<{
  message: BrainArch1SessionMessage;
  tokenUsage: BrainArch1MemoryTokenUsage;
}> => {
  // instantiate client
  const client = new Anthropic({
    apiKey: context.anthropic.auth.key,
    baseURL: context.anthropic.auth.url,
  });

  // prepare request
  const systemPrompt = extractSystemPrompt(input.messages);
  const anthropicMessages = toAnthropicMessages(input.messages);
  const anthropicTools =
    input.tools.length > 0 ? toAnthropicTools(input.tools) : undefined;

  // make api call
  const response = await client.messages.create({
    model: context.anthropic.llm.model,
    max_tokens: input.maxTokens ?? 8192,
    system: systemPrompt,
    messages: anthropicMessages,
    tools: anthropicTools,
  });

  // validate response
  if (response.content.length === 0) {
    throw new UnexpectedCodePathError('empty content in anthropic response', {
      response,
    });
  }

  // convert to bhrain format
  const message = toBrainArch1Message(response);
  const tokenUsage = new BrainArch1MemoryTokenUsage({
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    totalTokens: response.usage.input_tokens + response.usage.output_tokens,
    cacheReadTokens:
      (response.usage as { cache_read_input_tokens?: number })
        .cache_read_input_tokens ?? null,
    cacheWriteTokens:
      (response.usage as { cache_creation_input_tokens?: number })
        .cache_creation_input_tokens ?? null,
  });

  return { message, tokenUsage };
};

export const sdkAnthropic = {
  generate,
};
