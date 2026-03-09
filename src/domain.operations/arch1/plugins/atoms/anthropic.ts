import Anthropic from '@anthropic-ai/sdk';

import type { BrainArch1Atom } from '@src/domain.objects/BrainArch1/BrainArch1Atom';
import { BrainArch1MemoryTokenUsage } from '@src/domain.objects/BrainArch1/BrainArch1MemoryTokenUsage';
import { BrainArch1SessionMessage } from '@src/domain.objects/BrainArch1/BrainArch1SessionMessage';
import { BrainArch1ToolCall } from '@src/domain.objects/BrainArch1/BrainArch1ToolCall';

/**
 * .what = creates an anthropic atom for BrainArch1
 * .why = enables claude models with the brain architecture
 */
export const genAtomAnthropic = (input: { model: string }): BrainArch1Atom => ({
  platform: 'anthropic',
  model: input.model,
  description: `anthropic ${input.model} atom`,
  generate: async (params, context) => {
    // instantiate client
    const client = new Anthropic({
      apiKey: context.creds.anthropic.apiKey,
      baseURL: context.creds.anthropic.url ?? undefined,
    });

    // separate system message from conversation
    const systemMessage = params.messages.find((m) => m.role === 'system');
    const conversationMessages = params.messages.filter(
      (m) => m.role !== 'system',
    );

    // convert messages to anthropic format
    const messages: Anthropic.MessageParam[] = conversationMessages.map(
      (msg) => {
        if (msg.role === 'assistant' && msg.toolCalls) {
          return {
            role: 'assistant' as const,
            content: [
              ...(msg.content
                ? [{ type: 'text' as const, text: msg.content }]
                : []),
              ...msg.toolCalls.map((tc) => ({
                type: 'tool_use' as const,
                id: tc.id,
                name: tc.name,
                input: tc.input,
              })),
            ],
          };
        }
        if (msg.role === 'tool') {
          return {
            role: 'user' as const,
            content: [
              {
                type: 'tool_result' as const,
                tool_use_id: msg.toolCallId ?? '',
                content: msg.content ?? '',
              },
            ],
          };
        }
        return {
          role: msg.role as 'user' | 'assistant',
          content: msg.content ?? '',
        };
      },
    );

    // convert tools to anthropic format
    const tools: Anthropic.Tool[] = params.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.schema.input as Anthropic.Tool['input_schema'],
    }));

    // call api
    const response = await client.messages.create({
      model: input.model,
      max_tokens: params.maxTokens ?? 4096,
      system: systemMessage?.content ?? undefined,
      messages,
      tools: tools.length > 0 ? tools : undefined,
    });

    // extract response content
    const textBlock = response.content.find((c) => c.type === 'text');
    const toolUseBlocks = response.content.filter((c) => c.type === 'tool_use');

    // build tool calls if present
    const toolCalls =
      toolUseBlocks.length > 0
        ? toolUseBlocks.map((tc) => {
            if (tc.type !== 'tool_use')
              throw new Error('unexpected block type');
            return new BrainArch1ToolCall({
              id: tc.id,
              name: tc.name,
              input: tc.input as Record<string, unknown>,
            });
          })
        : null;

    return {
      message: new BrainArch1SessionMessage({
        role: 'assistant',
        content: textBlock?.type === 'text' ? textBlock.text : null,
        toolCalls,
        toolCallId: null,
      }),
      tokenUsage: new BrainArch1MemoryTokenUsage({
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        cacheReadTokens:
          'cache_read_input_tokens' in response.usage
            ? (response.usage.cache_read_input_tokens as number)
            : null,
        cacheWriteTokens:
          'cache_creation_input_tokens' in response.usage
            ? (response.usage.cache_creation_input_tokens as number)
            : null,
      }),
    };
  },
});
