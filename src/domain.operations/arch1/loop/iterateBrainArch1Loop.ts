import type { BrainAtom, BrainPlugToolDefinition } from 'rhachet/brains';

import type { BrainArch1Context } from '@src/domain.objects/BrainArch1/BrainArch1Context';
import { BrainArch1LoopIteration } from '@src/domain.objects/BrainArch1/BrainArch1LoopIteration';
import type { BrainArch1PermissionGuard } from '@src/domain.objects/BrainArch1/BrainArch1PermissionGuard';
import { BrainArch1SessionMessage } from '@src/domain.objects/BrainArch1/BrainArch1SessionMessage';
import { generateBrainArch1LlmResponse } from '@src/domain.operations/arch1/llm/generateBrainArch1LlmResponse';
import { executeBrainArch1ToolCall } from '@src/domain.operations/arch1/tool/executeBrainArch1ToolCall';

/**
 * .what = result of a single loop iteration
 * .why = provides updated messages and iteration metadata
 */
export interface IterateBrainArch1LoopResult {
  messages: BrainArch1SessionMessage[];
  iteration: BrainArch1LoopIteration;
}

/**
 * .what = performs a single iteration of the brain loop
 * .why = encapsulates generate → tools → append cycle
 *
 * .note = returns updated messages array with assistant response and tool results
 */
export const iterateBrainArch1Loop = async (
  input: {
    atom: BrainAtom;
    messages: BrainArch1SessionMessage[];
    tools: BrainPlugToolDefinition[];
    toolBySlug: Map<string, BrainPlugToolDefinition>;
    permissionGuard: BrainArch1PermissionGuard;
    iterationNumber: number;
    maxTokens?: number;
  },
  context: BrainArch1Context,
): Promise<IterateBrainArch1LoopResult> => {
  const startedAt = new Date().toISOString();

  // generate llm response
  const { message, tokenUsage } = await generateBrainArch1LlmResponse(
    {
      atom: input.atom,
      messages: input.messages,
      tools: input.tools,
      maxTokens: input.maxTokens,
    },
    context,
  );

  // append assistant message to context
  const messagesWithAssistant = [...input.messages, message];

  // check for tool calls
  const toolCalls = message.toolCalls ?? [];
  const hadToolCalls = toolCalls.length > 0;

  // if no tool calls, return early
  if (!hadToolCalls) {
    const completedAt = new Date().toISOString();
    return {
      messages: messagesWithAssistant,
      iteration: new BrainArch1LoopIteration({
        iterationNumber: input.iterationNumber,
        hadToolCalls: false,
        toolCallCount: 0,
        tokenUsage,
        startedAt,
        completedAt,
      }),
    };
  }

  // execute all tool calls
  const toolResults = await Promise.all(
    toolCalls.map((call) =>
      executeBrainArch1ToolCall(
        {
          call,
          toolBySlug: input.toolBySlug,
          permissionGuard: input.permissionGuard,
        },
        context,
      ),
    ),
  );

  // append tool results as tool messages
  const toolMessages = toolResults.map(
    (result) =>
      new BrainArch1SessionMessage({
        role: 'tool',
        content: result.output,
        toolCalls: null,
        toolCallId: result.callId,
      }),
  );

  const messagesWithToolResults = [...messagesWithAssistant, ...toolMessages];

  const completedAt = new Date().toISOString();
  return {
    messages: messagesWithToolResults,
    iteration: new BrainArch1LoopIteration({
      iterationNumber: input.iterationNumber,
      hadToolCalls: true,
      toolCallCount: toolCalls.length,
      tokenUsage,
      startedAt,
      completedAt,
    }),
  };
};
