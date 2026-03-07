import { getError, given, then, when } from 'test-fns';

import { genMockBrainArch1Context } from '@src/.test/genMockBrainArch1Context';
import { BrainArch1MemoryTokenUsage } from '@src/domain.objects/BrainArch1/BrainArch1MemoryTokenUsage';
import { BrainArch1Repl } from '@src/domain.objects/BrainArch1/BrainArch1Repl';
import { BrainArch1SessionMessage } from '@src/domain.objects/BrainArch1/BrainArch1SessionMessage';
import { genAtomAnthropic } from '@src/domain.operations/arch1/plugins/atoms/anthropic';

import { invokeBrainArch1 } from './invokeBrainArch1';

// mock the SDKs
jest.mock('@src/access/sdks/anthropic/sdkAnthropic', () => ({
  sdkAnthropic: {
    generate: jest.fn(),
  },
}));

import { sdkAnthropic } from '@src/access/sdks/anthropic/sdkAnthropic';

/**
 * .what = unit tests for invokeBrainArch1
 * .why = verify main entry point works correctly
 */
describe('invokeBrainArch1', () => {
  const getMockContext = genMockBrainArch1Context;

  const mockTokenUsage = new BrainArch1MemoryTokenUsage({
    inputTokens: 100,
    outputTokens: 50,
    totalTokens: 150,
    cacheReadTokens: null,
    cacheWriteTokens: null,
  });

  const replBase = new BrainArch1Repl({
    atom: genAtomAnthropic({ model: 'claude-3-5-sonnet-latest' }),
    toolboxes: [],
    memory: null,
    permission: null,
    constraints: {
      maxIterations: 100,
      maxTokens: 8192,
    },
    role: {
      systemPrompt: null,
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  given('[case1] simple input with no tools', () => {
    when('[t0] invokeBrainArch1 is called', () => {
      then('returns brain response', async () => {
        (sdkAnthropic.generate as jest.Mock).mockResolvedValue({
          message: new BrainArch1SessionMessage({
            role: 'assistant',
            content: 'Hello! How can I help you today?',
            toolCalls: null,
            toolCallId: null,
          }),
          tokenUsage: mockTokenUsage,
        });

        const result = await invokeBrainArch1(
          {
            repl: replBase,
            userInput: 'Hello',
          },
          getMockContext(),
        );

        expect(result.terminationReason).toBe('NATURAL_COMPLETION');
        expect(result.finalResponse).toBe('Hello! How can I help you today?');
        expect(result.error).toBeNull();
      });
    });
  });

  given('[case2] empty input', () => {
    when('[t0] invokeBrainArch1 is called', () => {
      then('returns clarification request', async () => {
        const result = await invokeBrainArch1(
          {
            repl: replBase,
            userInput: '',
          },
          getMockContext(),
        );

        expect(result.terminationReason).toBe('NATURAL_COMPLETION');
        expect(result.finalResponse).toContain('empty');
        expect(result.iterationCount).toBe(0);
        expect(sdkAnthropic.generate).not.toHaveBeenCalled();
      });

      then('handles whitespace-only input', async () => {
        const result = await invokeBrainArch1(
          {
            repl: replBase,
            userInput: '   \n\t  ',
          },
          getMockContext(),
        );

        expect(result.terminationReason).toBe('NATURAL_COMPLETION');
        expect(result.finalResponse).toContain('empty');
        expect(sdkAnthropic.generate).not.toHaveBeenCalled();
      });
    });
  });

  given('[case3] input exceeds max tokens', () => {
    when('[t0] invokeBrainArch1 is called with very long input', () => {
      then('throws error before execution', async () => {
        const longInput = 'x'.repeat(50000); // ~12500 tokens estimated

        const error = await getError(
          invokeBrainArch1(
            {
              repl: {
                ...replBase,
                constraints: {
                  ...replBase.constraints,
                  maxTokens: 1000, // low limit
                },
              },
              userInput: longInput,
            },
            getMockContext(),
          ),
        );

        expect(error).toBeDefined();
        expect(error?.message).toContain('exceeds context window');
        expect(sdkAnthropic.generate).not.toHaveBeenCalled();
      });
    });
  });

  given('[case4] custom system prompt', () => {
    when('[t0] invokeBrainArch1 is called with custom prompt', () => {
      then('uses custom system prompt', async () => {
        (sdkAnthropic.generate as jest.Mock).mockResolvedValue({
          message: new BrainArch1SessionMessage({
            role: 'assistant',
            content: 'Arr! How can I help ye?',
            toolCalls: null,
            toolCallId: null,
          }),
          tokenUsage: mockTokenUsage,
        });

        await invokeBrainArch1(
          {
            repl: {
              ...replBase,
              role: {
                systemPrompt: 'You are a pirate assistant.',
              },
            },
            userInput: 'Hello',
          },
          getMockContext(),
        );

        expect(sdkAnthropic.generate).toHaveBeenCalledWith(
          expect.objectContaining({
            messages: expect.arrayContaining([
              expect.objectContaining({
                role: 'system',
                content: 'You are a pirate assistant.',
              }),
            ]),
          }),
          expect.anything(),
        );
      });
    });
  });

  given('[case5] conversation history provided', () => {
    when('[t0] invokeBrainArch1 is called with history', () => {
      then('includes history in messages', async () => {
        (sdkAnthropic.generate as jest.Mock).mockResolvedValue({
          message: new BrainArch1SessionMessage({
            role: 'assistant',
            content: 'Your name is Alice.',
            toolCalls: null,
            toolCallId: null,
          }),
          tokenUsage: mockTokenUsage,
        });

        const history = [
          new BrainArch1SessionMessage({
            role: 'user',
            content: 'My name is Alice.',
            toolCalls: null,
            toolCallId: null,
          }),
          new BrainArch1SessionMessage({
            role: 'assistant',
            content: 'Nice to meet you, Alice!',
            toolCalls: null,
            toolCallId: null,
          }),
        ];

        await invokeBrainArch1(
          {
            repl: replBase,
            userInput: 'What is my name?',
            conversationHistory: history,
          },
          getMockContext(),
        );

        const callArgs = (sdkAnthropic.generate as jest.Mock).mock.calls[0][0];
        expect(callArgs.messages).toHaveLength(4); // system + 2 history + user
        expect(callArgs.messages[1].content).toBe('My name is Alice.');
        expect(callArgs.messages[2].content).toBe('Nice to meet you, Alice!');
        expect(callArgs.messages[3].content).toBe('What is my name?');
      });
    });
  });
});
