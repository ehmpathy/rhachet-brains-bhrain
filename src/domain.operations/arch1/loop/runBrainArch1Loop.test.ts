import { given, then, when } from 'test-fns';

import { genMockBrainArch1Context } from '@src/.test/genMockBrainArch1Context';
import type { BrainArch1Atom } from '@src/domain.objects/BrainArch1/BrainArch1Atom';
import { BrainArch1MemoryTokenUsage } from '@src/domain.objects/BrainArch1/BrainArch1MemoryTokenUsage';
import { BrainArch1PermissionDecision } from '@src/domain.objects/BrainArch1/BrainArch1PermissionDecision';
import type { BrainArch1PermissionGuard } from '@src/domain.objects/BrainArch1/BrainArch1PermissionGuard';
import { BrainArch1SessionMessage } from '@src/domain.objects/BrainArch1/BrainArch1SessionMessage';
import type { BrainArch1Toolbox } from '@src/domain.objects/BrainArch1/BrainArch1Toolbox';
import { BrainArch1ToolCall } from '@src/domain.objects/BrainArch1/BrainArch1ToolCall';
import { BrainArch1ToolDefinition } from '@src/domain.objects/BrainArch1/BrainArch1ToolDefinition';
import { BrainArch1ToolResult } from '@src/domain.objects/BrainArch1/BrainArch1ToolResult';

import { runBrainArch1Loop } from './runBrainArch1Loop';

// mock the SDKs
jest.mock('@src/access/sdks/anthropic/sdkAnthropic', () => ({
  sdkAnthropic: {
    generate: jest.fn(),
  },
}));

import { sdkAnthropic } from '@src/access/sdks/anthropic/sdkAnthropic';

/**
 * .what = unit tests for runBrainArch1Loop
 * .why = verify complete loop orchestration behavior
 */
describe('runBrainArch1Loop', () => {
  const getMockContext = genMockBrainArch1Context;

  // create a mock atom that delegates to sdkAnthropic (which is mocked)
  const createMockAtom = (): BrainArch1Atom => ({
    platform: 'anthropic',
    model: 'test-atom',
    description: 'mock anthropic atom for testing',
    generate: async (params, context) => {
      return sdkAnthropic.generate(
        {
          messages: params.messages,
          tools: params.tools,
          maxTokens: params.maxTokens,
        },
        {
          anthropic: {
            auth: { key: context.creds.anthropic.apiKey, url: undefined },
            llm: { model: 'claude-3-5-sonnet-latest' },
          },
          log: context.log,
        },
      );
    },
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
        (sdkAnthropic.generate as jest.Mock).mockResolvedValue({
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
            definitions: [],
            toolboxByToolName: new Map(),
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

  given('[case2] prompt requiring tool use then response', () => {
    const filesBox: BrainArch1Toolbox = {
      name: 'files',
      definitions: [
        new BrainArch1ToolDefinition({
          name: 'read',
          description: 'read file contents',
          schema: {
            input: {
              type: 'object',
              properties: { path: { type: 'string' } },
              required: ['path'],
            },
          },
          strict: false,
        }),
      ],
      execute: jest.fn().mockResolvedValue(
        new BrainArch1ToolResult({
          callId: 'call-1',
          success: true,
          output: 'file contents here',
          error: null,
        }),
      ),
    };

    when('[t0] runBrainArch1Loop is called', () => {
      then('completes after tool use and response', async () => {
        // first call: tool use
        (sdkAnthropic.generate as jest.Mock)
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
            definitions: filesBox.definitions,
            toolboxByToolName: new Map([['read', filesBox]]),
            permissionGuard: createMockPermissionGuard(),
          },
          getMockContext(),
        );

        expect(result.terminationReason).toBe('NATURAL_COMPLETION');
        expect(result.iterationCount).toBe(2);
        expect(result.finalResponse).toBe(
          'The file contains: file contents here',
        );
        expect(filesBox.execute).toHaveBeenCalledTimes(1);
      });
    });
  });

  given('[case3] loop exceeds max iterations', () => {
    const filesBox: BrainArch1Toolbox = {
      name: 'files',
      definitions: [],
      execute: jest.fn().mockResolvedValue(
        new BrainArch1ToolResult({
          callId: 'call-1',
          success: true,
          output: 'file contents',
          error: null,
        }),
      ),
    };

    when('[t0] runBrainArch1Loop is called with maxIterations=2', () => {
      then('terminates with MAX_ITERATIONS', async () => {
        // always return tool calls to force max iterations
        (sdkAnthropic.generate as jest.Mock).mockResolvedValue({
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
            content: 'Keep reading files',
            toolCalls: null,
            toolCallId: null,
          }),
        ];

        const result = await runBrainArch1Loop(
          {
            atom,
            messages: initialMessages,
            definitions: [],
            toolboxByToolName: new Map([['read', filesBox]]),
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
        (sdkAnthropic.generate as jest.Mock)
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

        const filesBox: BrainArch1Toolbox = {
          name: 'files',
          definitions: [],
          execute: jest.fn().mockResolvedValue(
            new BrainArch1ToolResult({
              callId: 'call-1',
              success: true,
              output: 'ok',
              error: null,
            }),
          ),
        };

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
            definitions: [],
            toolboxByToolName: new Map([['read', filesBox]]),
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
