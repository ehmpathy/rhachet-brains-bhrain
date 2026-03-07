import { BrainArch1MemoryCompactionResult } from '@src/domain.objects/BrainArch1/BrainArch1MemoryCompactionResult';
import type { BrainArch1MemoryManager } from '@src/domain.objects/BrainArch1/BrainArch1MemoryManager';
import type { BrainArch1SessionMessage } from '@src/domain.objects/BrainArch1/BrainArch1SessionMessage';

/**
 * .what = estimates token count for a message
 * .why = provides approximate token counting without external dependency
 *
 * .note = uses ~4 chars per token as rough estimate
 */
const estimateMessageTokens = (message: BrainArch1SessionMessage): number => {
  const contentTokens = message.content
    ? Math.ceil(message.content.length / 4)
    : 0;
  const toolCallsTokens = message.toolCalls
    ? message.toolCalls.reduce((sum, tc) => {
        const inputStr = JSON.stringify(tc.input);
        return sum + Math.ceil((tc.name.length + inputStr.length) / 4);
      }, 0)
    : 0;
  return contentTokens + toolCallsTokens + 10; // +10 for message overhead
};

/**
 * .what = sliding window memory manager
 * .why = simple strategy to keep context under limit by removing oldest messages
 */
export const memoryManagerSlidingWindow: BrainArch1MemoryManager = {
  name: 'slidingWindow',
  description:
    'Removes oldest messages to keep context within token limits, preserving system message and recent context',

  shouldCompact: async ({ currentTokens, maxTokens }) => {
    // compact when we exceed 80% of max tokens
    const threshold = maxTokens * 0.8;
    return currentTokens > threshold;
  },

  compact: async ({ messages, currentTokens, targetTokens }) => {
    // separate system message (always keep) from conversation
    const systemMessages = messages.filter((m) => m.role === 'system');
    const conversationMessages = messages.filter((m) => m.role !== 'system');

    // calculate system message tokens
    const systemTokens = systemMessages.reduce(
      (sum, m) => sum + estimateMessageTokens(m),
      0,
    );

    // keep removing oldest messages until under target
    let compactedConversation = [...conversationMessages];
    let conversationTokens = conversationMessages.reduce(
      (sum, m) => sum + estimateMessageTokens(m),
      0,
    );

    // remove messages from the beginning (oldest first)
    while (
      systemTokens + conversationTokens > targetTokens &&
      compactedConversation.length > 2 // keep at least last 2 messages
    ) {
      const removed = compactedConversation.shift();
      if (removed) {
        conversationTokens -= estimateMessageTokens(removed);
      }
    }

    // if we removed assistant messages with tool calls, remove orphaned tool results
    const validToolCallIds = new Set<string>();
    compactedConversation.forEach((m) => {
      if (m.toolCalls) {
        m.toolCalls.forEach((tc) => validToolCallIds.add(tc.id));
      }
    });

    // filter out orphaned tool results
    compactedConversation = compactedConversation.filter((m) => {
      if (m.role === 'tool' && m.toolCallId) {
        return validToolCallIds.has(m.toolCallId);
      }
      return true;
    });

    // recalculate tokens after orphan removal
    conversationTokens = compactedConversation.reduce(
      (sum, m) => sum + estimateMessageTokens(m),
      0,
    );

    // combine system messages with compacted conversation
    const compactedMessages = [...systemMessages, ...compactedConversation];
    const tokensAfter = systemTokens + conversationTokens;

    return new BrainArch1MemoryCompactionResult({
      messages: compactedMessages,
      tokensBefore: currentTokens,
      tokensAfter,
      compactionTokenUsage: null, // no llm call needed for sliding window
    });
  },
};
