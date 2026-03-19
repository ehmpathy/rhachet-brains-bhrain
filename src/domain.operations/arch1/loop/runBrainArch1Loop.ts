import type { BrainAtom, BrainPlugToolDefinition } from 'rhachet/brains';

import type { BrainArch1Context } from '@src/domain.objects/BrainArch1/BrainArch1Context';
import type { BrainArch1LoopIteration } from '@src/domain.objects/BrainArch1/BrainArch1LoopIteration';
import { BrainArch1LoopResult } from '@src/domain.objects/BrainArch1/BrainArch1LoopResult';
import { BrainArch1MemoryTokenUsage } from '@src/domain.objects/BrainArch1/BrainArch1MemoryTokenUsage';
import type { BrainArch1PermissionGuard } from '@src/domain.objects/BrainArch1/BrainArch1PermissionGuard';
import type { BrainArch1SessionMessage } from '@src/domain.objects/BrainArch1/BrainArch1SessionMessage';
import { iterateBrainArch1Loop } from '@src/domain.operations/arch1/loop/iterateBrainArch1Loop';

/**
 * .what = default max iterations if not specified
 * .why = prevents infinite loops
 */
const DEFAULT_MAX_ITERATIONS = 100;

/**
 * .what = aggregates token usage across multiple iterations
 * .why = enables cumulative cost/usage track
 */
const aggregateTokenUsage = (
  iterations: BrainArch1LoopIteration[],
): BrainArch1MemoryTokenUsage => {
  const totals = iterations.reduce(
    (acc, iter) => ({
      inputTokens: acc.inputTokens + iter.tokenUsage.inputTokens,
      outputTokens: acc.outputTokens + iter.tokenUsage.outputTokens,
      totalTokens: acc.totalTokens + iter.tokenUsage.totalTokens,
      cacheReadTokens:
        (acc.cacheReadTokens ?? 0) + (iter.tokenUsage.cacheReadTokens ?? 0),
      cacheWriteTokens:
        (acc.cacheWriteTokens ?? 0) + (iter.tokenUsage.cacheWriteTokens ?? 0),
    }),
    {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    },
  );

  return new BrainArch1MemoryTokenUsage({
    inputTokens: totals.inputTokens,
    outputTokens: totals.outputTokens,
    totalTokens: totals.totalTokens,
    cacheReadTokens: totals.cacheReadTokens || null,
    cacheWriteTokens: totals.cacheWriteTokens || null,
  });
};

/**
 * .what = runs the agentic loop until completion
 * .why = orchestrates iterations until natural completion or max iterations
 */
export const runBrainArch1Loop = async (
  input: {
    atom: BrainAtom;
    messages: BrainArch1SessionMessage[];
    tools: BrainPlugToolDefinition[];
    toolBySlug: Map<string, BrainPlugToolDefinition>;
    permissionGuard: BrainArch1PermissionGuard;
    maxIterations?: number;
    maxTokens?: number;
  },
  context: BrainArch1Context,
): Promise<BrainArch1LoopResult> => {
  const maxIterations = input.maxIterations ?? DEFAULT_MAX_ITERATIONS;
  const iterations: BrainArch1LoopIteration[] = [];
  let messages = input.messages;

  // run loop until no tool calls or max iterations
  for (let i = 0; i < maxIterations; i++) {
    // execute single iteration
    const result = await iterateBrainArch1Loop(
      {
        atom: input.atom,
        messages,
        tools: input.tools,
        toolBySlug: input.toolBySlug,
        permissionGuard: input.permissionGuard,
        iterationNumber: i,
        maxTokens: input.maxTokens,
      },
      context,
    );

    // track iteration
    iterations.push(result.iteration);
    messages = result.messages;

    // check for natural completion (no tool calls)
    if (!result.iteration.hadToolCalls) {
      const lastMessage = messages[messages.length - 1];
      return new BrainArch1LoopResult({
        terminationReason: 'NATURAL_COMPLETION',
        finalResponse: lastMessage?.content ?? null,
        finalMessage: lastMessage ?? null,
        messages,
        iterations,
        iterationCount: iterations.length,
        totalTokenUsage: aggregateTokenUsage(iterations),
        error: null,
      });
    }
  }

  // max iterations reached
  const lastMessage = messages[messages.length - 1];
  return new BrainArch1LoopResult({
    terminationReason: 'MAX_ITERATIONS',
    finalResponse: lastMessage?.content ?? null,
    finalMessage: lastMessage ?? null,
    messages,
    iterations,
    iterationCount: iterations.length,
    totalTokenUsage: aggregateTokenUsage(iterations),
    error: `loop terminated after ${maxIterations} iterations`,
  });
};
