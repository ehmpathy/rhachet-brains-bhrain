import { dividePrice } from 'iso-price';
import type { BrainAtom, BrainPlugToolDefinition } from 'rhachet/brains';
import { given, then, when } from 'test-fns';
import { z } from 'zod';

import { genMockBrainArch1Context } from '@src/.test/genMockBrainArch1Context';
import { BrainArch1MemoryTokenUsage } from '@src/domain.objects/BrainArch1/BrainArch1MemoryTokenUsage';
import { BrainArch1PermissionDecision } from '@src/domain.objects/BrainArch1/BrainArch1PermissionDecision';
import type { BrainArch1PermissionGuard } from '@src/domain.objects/BrainArch1/BrainArch1PermissionGuard';
import { BrainArch1SessionMessage } from '@src/domain.objects/BrainArch1/BrainArch1SessionMessage';
import { BrainArch1ToolCall } from '@src/domain.objects/BrainArch1/BrainArch1ToolCall';

import { runBrainArch1Loop } from './runBrainArch1Loop';

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
 * .what = unit tests for runBrainArch1Loop
 * .why = verify complete loop orchestration behavior
 */
describe('runBrainArch1Loop', () => {
  const getMockContext = genMockBrainArch1Context;

  // create a mock atom for tests
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

  const createMockTool = (
    slug: string,
    output: unknown,
  ): BrainPlugToolDefinition<unknown, unknown, 'repl'> => ({
    slug,
    name: slug,
    description: `${slug} description`,
    schema: { input: z.object({}), output: z.unknown() },
    execute: jest.fn().mockResolvedValue({
      signal: 'success' as const,
      output,
      time: { ms: 1 },
    }),
  });

  const atom = createMockAtom();

  const mockTokenUsage = new BrainArch1MemoryTokenUsage({
    inputTokens: 100,
    outputTokens: 50,
    totalTokens: 150,
    cacheReadTokens: null,
    cacheWriteTokens: null,
  });

  const createMockPermissionGuard = (): BrainArch1PermissionGuard => ({
    name: 'allowAll',
    description: 'allows all operations',
    check: jest
      .fn()
      .mockResolvedValue(
        new BrainArch1PermissionDecision({ verdict: 'allow', reason: null }),
      ),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  given('[case1] simple prompt with immediate response (no tools)', () => {
    when('[t0] runBrainArch1Loop is called', () => {
      then('completes in single iteration', async () => {
        mockLlmResponse.mockResolvedValue({
          message: new BrainArch1SessionMessage({
            role: 'assistant',
            content: 'Hello! How can I help you?',
            toolCalls: null,
            toolCallId: null,
          }),
          tokenUsage: mockTokenUsage,
        });

        const initialMessages = [
          new BrainArch1SessionMessage({
            role: 'user',
            content: 'Hello',
            toolCalls: null,
            toolCallId: null,
          }),
        ];

        const result = await runBrainArch1Loop(
          {
            atom,
            messages: initialMessages,
            tools: [],
            toolBySlug: new Map(),
            permissionGuard: createMockPermissionGuard(),
          },
          getMockContext(),
        );

        expect(result.terminationReason).toBe('NATURAL_COMPLETION');
        expect(result.iterationCount).toBe(1);
        expect(result.finalResponse).toBe('Hello! How can I help you?');
        expect(result.error).toBeNull();
      });
    });
  });

  given('[case2] prompt requires tool use then response', () => {
    const readTool = createMockTool('read', { content: 'file contents here' });

    when('[t0] runBrainArch1Loop is called', () => {
      then('completes after tool use and response', async () => {
        // first call: tool use
        mockLlmResponse
          .mockResolvedValueOnce({
            message: new BrainArch1SessionMessage({
              role: 'assistant',
              content: null,
              toolCalls: [
                new BrainArch1ToolCall({
                  id: 'call-1',
                  name: 'read',
                  input: { path: '/test.txt' },
                }),
              ],
              toolCallId: null,
            }),
            tokenUsage: mockTokenUsage,
          })
          // second call: final response
          .mockResolvedValueOnce({
            message: new BrainArch1SessionMessage({
              role: 'assistant',
              content: 'The file contains: file contents here',
              toolCalls: null,
              toolCallId: null,
            }),
            tokenUsage: mockTokenUsage,
          });

        const initialMessages = [
          new BrainArch1SessionMessage({
            role: 'user',
            content: 'Read /test.txt',
            toolCalls: null,
            toolCallId: null,
          }),
        ];

        const result = await runBrainArch1Loop(
          {
            atom,
            messages: initialMessages,
            tools: [readTool],
            toolBySlug: new Map([['read', readTool]]),
            permissionGuard: createMockPermissionGuard(),
          },
          getMockContext(),
        );

        expect(result.terminationReason).toBe('NATURAL_COMPLETION');
        expect(result.iterationCount).toBe(2);
        expect(result.finalResponse).toBe(
          'The file contains: file contents here',
        );
        expect(readTool.execute).toHaveBeenCalledTimes(1);
      });
    });
  });

  given('[case3] loop exceeds max iterations', () => {
    const readTool = createMockTool('read', { content: 'file contents' });

    when('[t0] runBrainArch1Loop is called with maxIterations=2', () => {
      then('terminates with MAX_ITERATIONS', async () => {
        // always return tool calls to force max iterations
        mockLlmResponse.mockResolvedValue({
          message: new BrainArch1SessionMessage({
            role: 'assistant',
            content: null,
            toolCalls: [
              new BrainArch1ToolCall({
                id: 'call-1',
                name: 'read',
                input: { path: '/test.txt' },
              }),
            ],
            toolCallId: null,
          }),
          tokenUsage: mockTokenUsage,
        });

        const initialMessages = [
          new BrainArch1SessionMessage({
            role: 'user',
            content: 'Keep read files',
            toolCalls: null,
            toolCallId: null,
          }),
        ];

        const result = await runBrainArch1Loop(
          {
            atom,
            messages: initialMessages,
            tools: [readTool],
            toolBySlug: new Map([['read', readTool]]),
            permissionGuard: createMockPermissionGuard(),
            maxIterations: 2,
          },
          getMockContext(),
        );

        expect(result.terminationReason).toBe('MAX_ITERATIONS');
        expect(result.iterationCount).toBe(2);
        expect(result.error).toContain('2 iterations');
      });
    });
  });

  given('[case4] aggregates token usage across iterations', () => {
    when('[t0] runBrainArch1Loop completes with multiple iterations', () => {
      then('totalTokenUsage is sum of all iterations', async () => {
        const readTool = createMockTool('read', { content: 'ok' });

        mockLlmResponse
          .mockResolvedValueOnce({
            message: new BrainArch1SessionMessage({
              role: 'assistant',
              content: null,
              toolCalls: [
                new BrainArch1ToolCall({
                  id: 'call-1',
                  name: 'read',
                  input: {},
                }),
              ],
              toolCallId: null,
            }),
            tokenUsage: new BrainArch1MemoryTokenUsage({
              inputTokens: 100,
              outputTokens: 50,
              totalTokens: 150,
              cacheReadTokens: null,
              cacheWriteTokens: null,
            }),
          })
          .mockResolvedValueOnce({
            message: new BrainArch1SessionMessage({
              role: 'assistant',
              content: 'Done',
              toolCalls: null,
              toolCallId: null,
            }),
            tokenUsage: new BrainArch1MemoryTokenUsage({
              inputTokens: 200,
              outputTokens: 100,
              totalTokens: 300,
              cacheReadTokens: null,
              cacheWriteTokens: null,
            }),
          });

        const result = await runBrainArch1Loop(
          {
            atom,
            messages: [
              new BrainArch1SessionMessage({
                role: 'user',
                content: 'test',
                toolCalls: null,
                toolCallId: null,
              }),
            ],
            tools: [readTool],
            toolBySlug: new Map([['read', readTool]]),
            permissionGuard: createMockPermissionGuard(),
          },
          getMockContext(),
        );

        expect(result.iterationCount).toBe(2);
        expect(result.totalTokenUsage.inputTokens).toBe(300);
        expect(result.totalTokenUsage.outputTokens).toBe(150);
        expect(result.totalTokenUsage.totalTokens).toBe(450);
      });
    });
  });
});
