import { given, then, when } from 'test-fns';

import { genMockBrainArch1Context } from '@src/.test/genMockBrainArch1Context';
import { BrainArch1SessionMessage } from '@src/domain.objects/BrainArch1/BrainArch1SessionMessage';

import { memoryManagerSlidingWindow } from './slidingWindow';

const mockContext = genMockBrainArch1Context();

describe('memoryManagerSlidingWindow', () => {
  given('[case1] shouldCompact', () => {
    when('[t0] tokens are under 80% threshold', () => {
      then('returns false', async () => {
        const result = await memoryManagerSlidingWindow.shouldCompact(
          {
            messages: [],
            currentTokens: 7000,
            maxTokens: 10000,
          },
          mockContext,
        );

        expect(result).toBe(false);
      });
    });

    when('[t1] tokens exceed 80% threshold', () => {
      then('returns true', async () => {
        const result = await memoryManagerSlidingWindow.shouldCompact(
          {
            messages: [],
            currentTokens: 8500,
            maxTokens: 10000,
          },
          mockContext,
        );

        expect(result).toBe(true);
      });
    });

    when('[t2] tokens exactly at 80% threshold', () => {
      then('returns false', async () => {
        const result = await memoryManagerSlidingWindow.shouldCompact(
          {
            messages: [],
            currentTokens: 8000,
            maxTokens: 10000,
          },
          mockContext,
        );

        expect(result).toBe(false);
      });
    });
  });

  given('[case2] compact', () => {
    when('[t0] messages exceed target', () => {
      then('removes oldest non-system messages', async () => {
        const messages = [
          new BrainArch1SessionMessage({
            role: 'system',
            content: 'You are a helpful assistant.',
            toolCalls: null,
            toolCallId: null,
          }),
          new BrainArch1SessionMessage({
            role: 'user',
            content:
              'First message - this is the oldest user message and should be removed during compaction',
            toolCalls: null,
            toolCallId: null,
          }),
          new BrainArch1SessionMessage({
            role: 'assistant',
            content:
              'First response - this old response should also be removed during the compaction process',
            toolCalls: null,
            toolCallId: null,
          }),
          new BrainArch1SessionMessage({
            role: 'user',
            content: 'Second message - this is newer and might be kept',
            toolCalls: null,
            toolCallId: null,
          }),
          new BrainArch1SessionMessage({
            role: 'assistant',
            content: 'Second response - most recent response',
            toolCalls: null,
            toolCallId: null,
          }),
        ];

        const result = await memoryManagerSlidingWindow.compact(
          {
            messages,
            currentTokens: 1000,
            targetTokens: 50, // very low target to force compaction
          },
          mockContext,
        );

        // should keep system message and at least 2 recent messages
        expect(result.messages.length).toBeGreaterThanOrEqual(3); // system + at least 2 recent
        expect(result.messages[0]?.role).toBe('system');
        expect(result.tokensAfter).toBeLessThan(result.tokensBefore);
        expect(result.compactionTokenUsage).toBeNull();
      });
    });

    when('[t1] system message should always be preserved', () => {
      then('keeps system message even when compacting heavily', async () => {
        const messages = [
          new BrainArch1SessionMessage({
            role: 'system',
            content: 'Important system instructions that must be kept.',
            toolCalls: null,
            toolCallId: null,
          }),
          new BrainArch1SessionMessage({
            role: 'user',
            content: 'User message',
            toolCalls: null,
            toolCallId: null,
          }),
          new BrainArch1SessionMessage({
            role: 'assistant',
            content: 'Assistant response',
            toolCalls: null,
            toolCallId: null,
          }),
        ];

        const result = await memoryManagerSlidingWindow.compact(
          {
            messages,
            currentTokens: 500,
            targetTokens: 100,
          },
          mockContext,
        );

        const systemMsg = result.messages.find((m) => m.role === 'system');
        expect(systemMsg).toBeDefined();
        expect(systemMsg!.content).toContain('Important system instructions');
      });
    });

    when('[t2] no compaction needed', () => {
      then('returns all messages unchanged', async () => {
        const messages = [
          new BrainArch1SessionMessage({
            role: 'system',
            content: 'System prompt',
            toolCalls: null,
            toolCallId: null,
          }),
          new BrainArch1SessionMessage({
            role: 'user',
            content: 'Hello',
            toolCalls: null,
            toolCallId: null,
          }),
        ];

        const result = await memoryManagerSlidingWindow.compact(
          {
            messages,
            currentTokens: 50,
            targetTokens: 1000, // target is higher than current
          },
          mockContext,
        );

        expect(result.messages.length).toBe(messages.length);
      });
    });
  });

  given('[case3] metadata', () => {
    when('[t0] checking manager properties', () => {
      then('has correct name', () => {
        expect(memoryManagerSlidingWindow.name).toBe('slidingWindow');
      });

      then('has description', () => {
        expect(memoryManagerSlidingWindow.description).toBeTruthy();
        expect(memoryManagerSlidingWindow.description).toContain('oldest');
      });
    });
  });
});
