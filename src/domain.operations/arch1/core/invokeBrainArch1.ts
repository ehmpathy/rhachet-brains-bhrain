import { BadRequestError } from 'helpful-errors';

import type { BrainArch1Context } from '@src/domain.objects/BrainArch1/BrainArch1Context';
import { BrainArch1LoopResult } from '@src/domain.objects/BrainArch1/BrainArch1LoopResult';
import { BrainArch1MemoryTokenUsage } from '@src/domain.objects/BrainArch1/BrainArch1MemoryTokenUsage';
import { BrainArch1PermissionDecision } from '@src/domain.objects/BrainArch1/BrainArch1PermissionDecision';
import type { BrainArch1PermissionGuard } from '@src/domain.objects/BrainArch1/BrainArch1PermissionGuard';
import type { BrainArch1Repl } from '@src/domain.objects/BrainArch1/BrainArch1Repl';
import { BrainArch1SessionMessage } from '@src/domain.objects/BrainArch1/BrainArch1SessionMessage';
import { runBrainArch1Loop } from '@src/domain.operations/arch1/loop/runBrainArch1Loop';
import { mergeBrainArch1Toolboxes } from '@src/domain.operations/arch1/tool/mergeBrainArch1Toolboxes';

/**
 * .what = default system prompt when none provided
 * .why = establishes baseline assistant behavior
 */
const DEFAULT_SYSTEM_PROMPT = `You are a helpful assistant with access to tools.
Use the tools when needed to help answer questions and complete tasks.
Be concise and accurate in your responses.`;

/**
 * .what = default permission guard that allows all operations
 * .why = provides sensible default when no guard specified
 */
const createDefaultPermissionGuard = (): BrainArch1PermissionGuard => ({
  name: 'allowAll',
  description: 'allows all tool operations',
  check: async () =>
    new BrainArch1PermissionDecision({ verdict: 'allow', reason: null }),
});

/**
 * .what = invokes the brain with a user input and returns the response
 * .why = provides simple entry point for using the agentic loop
 */
export const invokeBrainArch1 = async (
  input: {
    repl: BrainArch1Repl;
    userInput: string;
    conversationHistory?: BrainArch1SessionMessage[];
  },
  context: BrainArch1Context,
): Promise<BrainArch1LoopResult> => {
  // validate input
  if (!input.userInput.trim()) {
    return new BrainArch1LoopResult({
      terminationReason: 'NATURAL_COMPLETION',
      finalResponse:
        'I notice your input was empty. Could you please provide a question or task?',
      finalMessage: new BrainArch1SessionMessage({
        role: 'assistant',
        content:
          'I notice your input was empty. Could you please provide a question or task?',
        toolCalls: null,
        toolCallId: null,
      }),
      messages: [],
      iterations: [],
      iterationCount: 0,
      totalTokenUsage: new BrainArch1MemoryTokenUsage({
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        cacheReadTokens: null,
        cacheWriteTokens: null,
      }),
      error: null,
    });
  }

  // merge toolboxes
  const { definitions, toolboxByToolName } = mergeBrainArch1Toolboxes({
    toolboxes: input.repl.toolboxes,
  });

  // build initial messages
  const systemPrompt = input.repl.role.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;
  const systemMessage = new BrainArch1SessionMessage({
    role: 'system',
    content: systemPrompt,
    toolCalls: null,
    toolCallId: null,
  });

  const userMessage = new BrainArch1SessionMessage({
    role: 'user',
    content: input.userInput,
    toolCalls: null,
    toolCallId: null,
  });

  const messages = [
    systemMessage,
    ...(input.conversationHistory ?? []),
    userMessage,
  ];

  // estimate input token count (rough approximation)
  const estimatedInputTokens = messages.reduce((acc, msg) => {
    const content = msg.content ?? '';
    return acc + Math.ceil(content.length / 4); // ~4 chars per token
  }, 0);

  // check if input exceeds max tokens
  if (estimatedInputTokens > input.repl.constraints.maxTokens) {
    throw new BadRequestError('input exceeds context window limit', {
      estimatedInputTokens,
      maxTokens: input.repl.constraints.maxTokens,
    });
  }

  // get permission guard
  const permissionGuard =
    input.repl.permission ?? createDefaultPermissionGuard();

  // run the agentic loop
  const result = await runBrainArch1Loop(
    {
      atom: input.repl.atom,
      messages,
      definitions,
      toolboxByToolName,
      permissionGuard,
      maxIterations: input.repl.constraints.maxIterations,
      maxTokens: input.repl.constraints.maxTokens,
    },
    context,
  );

  return result;
};
