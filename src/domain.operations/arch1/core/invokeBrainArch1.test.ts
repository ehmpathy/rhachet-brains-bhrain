import { dividePrice } from 'iso-price';
import type { BrainAtom } from 'rhachet/brains';
import { getError, given, then, when } from 'test-fns';

import { genMockBrainArch1Context } from '@src/.test/genMockBrainArch1Context';
import { BrainArch1MemoryTokenUsage } from '@src/domain.objects/BrainArch1/BrainArch1MemoryTokenUsage';
import { BrainArch1SessionMessage } from '@src/domain.objects/BrainArch1/BrainArch1SessionMessage';

import { type BrainArch1Config, invokeBrainArch1 } from './invokeBrainArch1';

// mock the llm response function
jest.mock(
  '@src/domain.operations/arch1/llm/generateBrainArch1LlmResponse',
  () => ({
    generateBrainArch1LlmResponse: jest.fn(),
  }),
);

import { generateBrainArch1LlmResponse } from '@src/domain.operations/arch1/llm/generateBrainArch1LlmResponse';

const mockLlmResponse = generateBrainArch1LlmResponse as jest.Mock;

/**
 * .what = creates a mock atom for tests
 * .why = enables unit tests without real SDK dependencies
 */
const createMockAtom = (): BrainAtom => ({
  repo: 'test',
  slug: 'test/atom',
  description: 'mock atom for test',
  spec: {
    cost: {
      time: {
        speed: { tokens: 100, per: { seconds: 1 } },
        latency: { milliseconds: 100 },
      },
      cash: {
        per: 'token',
        input: dividePrice({ of: '$1', by: 1000000 }),
        output: dividePrice({ of: '$1', by: 1000000 }),
        cache: {
          get: dividePrice({ of: '$0', by: 1000000 }),
          set: dividePrice({ of: '$0', by: 1000000 }),
        },
      },
    },
    gain: {
      size: { context: { tokens: 100000 } },
      grades: { swe: 50, mmlu: 50 },
      cutoff: '2025-01-01',
      domain: 'ALL',
      skills: { tooluse: true, vision: false },
    },
  },
  ask: jest.fn(),
});

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

  const configBase: BrainArch1Config = {
    atom: createMockAtom(),
    toolboxes: [],
    systemPrompt: null,
    maxIterations: 100,
    maxTokens: 8192,
    permissionGuard: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  given('[case1] simple input with no tools', () => {
    when('[t0] invokeBrainArch1 is called', () => {
      then('returns brain response', async () => {
        mockLlmResponse.mockResolvedValue({
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
            config: configBase,
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
            config: configBase,
            userInput: '',
          },
          getMockContext(),
        );

        expect(result.terminationReason).toBe('NATURAL_COMPLETION');
        expect(result.finalResponse).toContain('empty');
        expect(result.iterationCount).toBe(0);
        expect(mockLlmResponse).not.toHaveBeenCalled();
      });

      then('handles whitespace-only input', async () => {
        const result = await invokeBrainArch1(
          {
            config: configBase,
            userInput: '   \n\t  ',
          },
          getMockContext(),
        );

        expect(result.terminationReason).toBe('NATURAL_COMPLETION');
        expect(result.finalResponse).toContain('empty');
        expect(mockLlmResponse).not.toHaveBeenCalled();
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
              config: {
                ...configBase,
                maxTokens: 1000, // low limit
              },
              userInput: longInput,
            },
            getMockContext(),
          ),
        );

        expect(error).toBeDefined();
        expect(error?.message).toContain('exceeds context window');
        expect(mockLlmResponse).not.toHaveBeenCalled();
      });
    });
  });

  given('[case4] custom system prompt', () => {
    when('[t0] invokeBrainArch1 is called with custom prompt', () => {
      then('uses custom system prompt', async () => {
        mockLlmResponse.mockResolvedValue({
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
            config: {
              ...configBase,
              systemPrompt: 'You are a pirate assistant.',
            },
            userInput: 'Hello',
          },
          getMockContext(),
        );

        expect(mockLlmResponse).toHaveBeenCalledWith(
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
        mockLlmResponse.mockResolvedValue({
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
            config: configBase,
            userInput: 'What is my name?',
            conversationHistory: history,
          },
          getMockContext(),
        );

        const callArgs = mockLlmResponse.mock.calls[0][0];
        expect(callArgs.messages).toHaveLength(4); // system + 2 history + user
        expect(callArgs.messages[1].content).toBe('My name is Alice.');
        expect(callArgs.messages[2].content).toBe('Nice to meet you, Alice!');
        expect(callArgs.messages[3].content).toBe('What is my name?');
      });
    });
  });
});
