import type { BrainAtom, BrainPlugToolDefinition } from 'rhachet/brains';
import { z } from 'zod';

import type { BrainArch1Context } from '@src/domain.objects/BrainArch1/BrainArch1Context';
import { BrainArch1MemoryTokenUsage } from '@src/domain.objects/BrainArch1/BrainArch1MemoryTokenUsage';
import { BrainArch1SessionMessage } from '@src/domain.objects/BrainArch1/BrainArch1SessionMessage';
import { BrainArch1ToolCall } from '@src/domain.objects/BrainArch1/BrainArch1ToolCall';

/**
 * .what = schema for llm text response
 * .why = enables structured output via rhachet's BrainAtom.ask()
 *
 * .note = plain string schema required because open-source models (deepseek, kimi)
 *         support either tool_calls OR structured json, not both.
 *         when tools are plugged, atoms like chutes enforce z.string() schema.
 */
const responseSchema = z.string();

/**
 * .what = builds prompt from messages array
 * .why = rhachet's atom.ask() expects a string prompt, not messages array
 *
 * .note = uses XML tags for clear role boundaries
 * .note = tool calls tracked via API, not serialized into prompt text
 */
const buildPromptFromMessages = (
  messages: BrainArch1SessionMessage[],
): string => {
  return messages
    .map((msg) => {
      if (msg.role === 'system') {
        return `<system>\n${msg.content}\n</system>`;
      }
      if (msg.role === 'user') {
        return `<user>\n${msg.content}\n</user>`;
      }
      if (msg.role === 'assistant') {
        // note: tool calls tracked via API, not serialized into prompt
        return `<assistant>\n${msg.content ?? ''}\n</assistant>`;
      }
      if (msg.role === 'tool') {
        return `<tool_result id="${msg.toolCallId}">\n${msg.content}\n</tool_result>`;
      }
      return '';
    })
    .filter(Boolean)
    .join('\n\n');
};

/**
 * .what = generates an llm response via the provided atom
 * .why = delegates to atom.ask(), enables brain to work with any rhachet BrainAtom
 *
 * .note = converts between bhrain's message-based interface and rhachet's prompt-based interface
 */
export const generateBrainArch1LlmResponse = async (
  input: {
    atom: BrainAtom;
    messages: BrainArch1SessionMessage[];
    tools: BrainPlugToolDefinition[];
    maxTokens?: number;
  },
  context: BrainArch1Context,
): Promise<{
  message: BrainArch1SessionMessage;
  tokenUsage: BrainArch1MemoryTokenUsage;
}> => {
  // convert messages to prompt
  const prompt = buildPromptFromMessages(input.messages);

  // build plugs with tools (rhachet's BrainPlugToolDefinition used directly)
  const plugs = { tools: input.tools };

  // call atom.ask()
  const result = await input.atom.ask(
    {
      prompt,
      plugs,
      role: {},
      schema: { output: responseSchema },
    },
    {},
  );

  // transform response to bhrain format
  const toolCalls =
    result.calls?.tools?.map(
      (invocation: { exid: string; slug: string; input: unknown }) =>
        new BrainArch1ToolCall({
          id: invocation.exid,
          name: invocation.slug,
          input: invocation.input as Record<string, unknown>,
        }),
    ) ?? null;

  // diagnostic: trace xai response structure
  const hasToolCalls = toolCalls && toolCalls.length > 0;
  const hasOutput = result.output !== null && result.output !== undefined;
  const hasContent = hasOutput && result.output !== null;

  // log full atom response on final iteration (no tool calls)
  if (!hasToolCalls) {
    console.log(
      '🔬 FULL ATOM RESPONSE (final iteration):',
      JSON.stringify(
        {
          output: result.output,
          calls: result.calls,
          metrics: {
            tokens: result.metrics?.size?.tokens,
          },
          episodeExid: result.episode?.exid,
        },
        null,
        2,
      ),
    );
  }

  if (!hasToolCalls && !hasContent) {
    context.log?.warn?.('⚠️ llm returned no content and no tool calls', {
      hasOutput,
      output: result.output,
      hasToolCalls,
      toolCallsCount: toolCalls?.length ?? 0,
    });
  }

  const message = new BrainArch1SessionMessage({
    role: 'assistant',
    content: result.output ?? null,
    toolCalls: hasToolCalls ? toolCalls : null,
    toolCallId: null,
  });

  const tokenUsage = new BrainArch1MemoryTokenUsage({
    inputTokens: result.metrics.size.tokens.input,
    outputTokens: result.metrics.size.tokens.output,
    totalTokens:
      result.metrics.size.tokens.input + result.metrics.size.tokens.output,
    cacheReadTokens: result.metrics.size.tokens.cache.get ?? null,
    cacheWriteTokens: result.metrics.size.tokens.cache.set ?? null,
  });

  return { message, tokenUsage };
};
