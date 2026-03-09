import OpenAI from 'openai';

import type { BrainArch1Atom } from '@src/domain.objects/BrainArch1/BrainArch1Atom';
import { BrainArch1MemoryTokenUsage } from '@src/domain.objects/BrainArch1/BrainArch1MemoryTokenUsage';
import { BrainArch1SessionMessage } from '@src/domain.objects/BrainArch1/BrainArch1SessionMessage';
import { BrainArch1ToolCall } from '@src/domain.objects/BrainArch1/BrainArch1ToolCall';

/**
 * .what = creates an openai atom for BrainArch1
 * .why = enables gpt models with the brain architecture
 */
export const genAtomOpenai = (input: { model: string }): BrainArch1Atom => ({
  platform: 'openai',
  model: input.model,
  description: `openai ${input.model} atom`,
  generate: async (params, context) => {
    // instantiate client
    const client = new OpenAI({
      apiKey: context.creds.openai.apiKey,
      baseURL: context.creds.openai.url ?? undefined,
    });

    // convert messages to openai format
    const messages: OpenAI.ChatCompletionMessageParam[] = params.messages.map(
      (msg) => {
        if (msg.role === 'system') {
          return { role: 'system' as const, content: msg.content ?? '' };
        }
        if (msg.role === 'assistant' && msg.toolCalls) {
          return {
            role: 'assistant' as const,
            content: msg.content ?? null,
            tool_calls: msg.toolCalls.map((tc) => ({
              id: tc.id,
              type: 'function' as const,
              function: {
                name: tc.name,
                arguments: JSON.stringify(tc.input),
              },
            })),
          };
        }
        if (msg.role === 'tool') {
          return {
            role: 'tool' as const,
            tool_call_id: msg.toolCallId ?? '',
            content: msg.content ?? '',
          };
        }
        return {
          role: msg.role as 'user' | 'assistant',
          content: msg.content ?? '',
        };
      },
    );

    // convert tools to openai format
    const tools: OpenAI.ChatCompletionTool[] = params.tools.map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.schema.input,
        strict: tool.strict,
      },
    }));

    // call api
    const response = await client.chat.completions.create({
      model: input.model,
      max_tokens: params.maxTokens ?? 4096,
      messages,
      tools: tools.length > 0 ? tools : undefined,
    });

    const choice = response.choices[0];
    if (!choice) throw new Error('no response from openai');

    // build tool calls if present
    const toolCalls = choice.message.tool_calls
      ? choice.message.tool_calls.map(
          (tc) =>
            new BrainArch1ToolCall({
              id: tc.id,
              name: tc.function.name,
              input: JSON.parse(tc.function.arguments) as Record<
                string,
                unknown
              >,
            }),
        )
      : null;

    return {
      message: new BrainArch1SessionMessage({
        role: 'assistant',
        content: choice.message.content,
        toolCalls,
        toolCallId: null,
      }),
      tokenUsage: new BrainArch1MemoryTokenUsage({
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
        cacheReadTokens: null,
        cacheWriteTokens: null,
      }),
    };
  },
});
