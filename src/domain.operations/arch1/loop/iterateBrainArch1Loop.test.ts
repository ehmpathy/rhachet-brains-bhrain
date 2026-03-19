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

import { iterateBrainArch1Loop } from './iterateBrainArch1Loop';

// mock the llm response function
jest.mock(
  '@src/domain.operations/arch1/llm/generateBrainArch1LlmResponse',
  () => ({
    generateBrainArch1LlmResponse: jest.fn(),
  }),
);

import { generateBrainArch1LlmResponse } from '@src/domain.operations/arch1/llm/generateBrainArch1LlmResponse';

/**
 * .what = unit tests for iterateBrainArch1Loop
 * .why = verify single iteration cycle works correctly
 */
describe('iterateBrainArch1Loop', () => {
  const getMockContext = genMockBrainArch1Context;

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

  given('[case1] llm responds with text only (no tools)', () => {
    when('[t0] iterate is called', () => {
      then('returns messages with assistant response', async () => {
        const textResponse = new BrainArch1SessionMessage({
          role: 'assistant',
          content: 'Hello! How can I help you?',
          toolCalls: null,
          toolCallId: null,
        });
        (generateBrainArch1LlmResponse as jest.Mock).mockResolvedValue({
          message: textResponse,
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

        const result = await iterateBrainArch1Loop(
          {
            atom,
            messages: initialMessages,
            tools: [],
            toolBySlug: new Map(),
            permissionGuard: createMockPermissionGuard(),
            iterationNumber: 0,
          },
          getMockContext(),
        );

        expect(result.messages).toHaveLength(2);
        expect(result.messages[1]?.role).toBe('assistant');
        expect(result.iteration.hadToolCalls).toBe(false);
        expect(result.iteration.toolCallCount).toBe(0);
      });
    });
  });

  given('[case2] llm responds with tool calls', () => {
    const readTool = createMockTool('read', { content: 'file contents here' });

    when('[t0] iterate is called', () => {
      then('executes tools and appends results', async () => {
        const toolCallResponse = new BrainArch1SessionMessage({
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
        });
        (generateBrainArch1LlmResponse as jest.Mock).mockResolvedValue({
          message: toolCallResponse,
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

        const toolBySlug = new Map([['read', readTool]]);

        const result = await iterateBrainArch1Loop(
          {
            atom,
            messages: initialMessages,
            tools: [readTool],
            toolBySlug,
            permissionGuard: createMockPermissionGuard(),
            iterationNumber: 0,
          },
          getMockContext(),
        );

        expect(result.messages).toHaveLength(3);
        expect(result.messages[1]?.role).toBe('assistant');
        expect(result.messages[2]?.role).toBe('tool');
        expect(result.messages[2]?.content).toContain('file contents here');
        expect(result.iteration.hadToolCalls).toBe(true);
        expect(result.iteration.toolCallCount).toBe(1);
        expect(readTool.execute).toHaveBeenCalled();
      });
    });
  });

  given('[case3] llm responds with multiple tool calls', () => {
    const readTool1 = createMockTool('read', { content: 'file1 contents' });
    const readTool2 = createMockTool('read', { content: 'file2 contents' });
    // use same tool for both calls
    const readTool: BrainPlugToolDefinition<unknown, unknown, 'repl'> = {
      slug: 'read',
      name: 'read',
      description: 'read file',
      schema: { input: z.object({}), output: z.unknown() },
      execute: jest
        .fn()
        .mockResolvedValueOnce({
          signal: 'success' as const,
          output: { content: 'file1 contents' },
          time: { ms: 1 },
        })
        .mockResolvedValueOnce({
          signal: 'success' as const,
          output: { content: 'file2 contents' },
          time: { ms: 1 },
        }),
    };

    when('[t0] iterate is called', () => {
      then('executes all tools and appends all results', async () => {
        const toolCallResponse = new BrainArch1SessionMessage({
          role: 'assistant',
          content: null,
          toolCalls: [
            new BrainArch1ToolCall({
              id: 'call-1',
              name: 'read',
              input: { path: '/file1.txt' },
            }),
            new BrainArch1ToolCall({
              id: 'call-2',
              name: 'read',
              input: { path: '/file2.txt' },
            }),
          ],
          toolCallId: null,
        });
        (generateBrainArch1LlmResponse as jest.Mock).mockResolvedValue({
          message: toolCallResponse,
          tokenUsage: mockTokenUsage,
        });

        const initialMessages = [
          new BrainArch1SessionMessage({
            role: 'user',
            content: 'Read both files',
            toolCalls: null,
            toolCallId: null,
          }),
        ];

        const toolBySlug = new Map([['read', readTool]]);

        const result = await iterateBrainArch1Loop(
          {
            atom,
            messages: initialMessages,
            tools: [readTool],
            toolBySlug,
            permissionGuard: createMockPermissionGuard(),
            iterationNumber: 0,
          },
          getMockContext(),
        );

        expect(result.messages).toHaveLength(4);
        expect(result.messages[2]?.role).toBe('tool');
        expect(result.messages[3]?.role).toBe('tool');
        expect(result.iteration.hadToolCalls).toBe(true);
        expect(result.iteration.toolCallCount).toBe(2);
        expect(readTool.execute).toHaveBeenCalledTimes(2);
      });
    });
  });
});
