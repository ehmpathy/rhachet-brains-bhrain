import { given, then, when } from 'test-fns';

import { genMockBrainArch1Context } from '@src/.test/genMockBrainArch1Context';
import type { BrainArch1Atom } from '@src/domain.objects/BrainArch1/BrainArch1Atom';
import { BrainArch1MemoryTokenUsage } from '@src/domain.objects/BrainArch1/BrainArch1MemoryTokenUsage';
import { BrainArch1PermissionDecision } from '@src/domain.objects/BrainArch1/BrainArch1PermissionDecision';
import type { BrainArch1PermissionGuard } from '@src/domain.objects/BrainArch1/BrainArch1PermissionGuard';
import { BrainArch1SessionMessage } from '@src/domain.objects/BrainArch1/BrainArch1SessionMessage';
import type { BrainArch1Toolbox } from '@src/domain.objects/BrainArch1/BrainArch1Toolbox';
import { BrainArch1ToolCall } from '@src/domain.objects/BrainArch1/BrainArch1ToolCall';
import { BrainArch1ToolResult } from '@src/domain.objects/BrainArch1/BrainArch1ToolResult';

import { iterateBrainArch1Loop } from './iterateBrainArch1Loop';

// mock the generate function
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

  const createMockAtom = (): BrainArch1Atom => ({
    platform: 'test',
    model: 'test-atom',
    description: 'mock atom for testing',
    generate: jest.fn(),
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
            definitions: [],
            toolboxByToolName: new Map(),
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
    const filesBox: BrainArch1Toolbox = {
      name: 'files',
      definitions: [],
      execute: jest.fn().mockResolvedValue(
        new BrainArch1ToolResult({
          callId: 'call-1',
          success: true,
          output: 'file contents here',
          error: null,
        }),
      ),
    };

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

        const toolboxByToolName = new Map([['read', filesBox]]);

        const result = await iterateBrainArch1Loop(
          {
            atom,
            messages: initialMessages,
            definitions: [],
            toolboxByToolName,
            permissionGuard: createMockPermissionGuard(),
            iterationNumber: 0,
          },
          getMockContext(),
        );

        expect(result.messages).toHaveLength(3);
        expect(result.messages[1]?.role).toBe('assistant');
        expect(result.messages[2]?.role).toBe('tool');
        expect(result.messages[2]?.content).toBe('file contents here');
        expect(result.iteration.hadToolCalls).toBe(true);
        expect(result.iteration.toolCallCount).toBe(1);
        expect(filesBox.execute).toHaveBeenCalled();
      });
    });
  });

  given('[case3] llm responds with multiple tool calls', () => {
    const filesBox: BrainArch1Toolbox = {
      name: 'files',
      definitions: [],
      execute: jest
        .fn()
        .mockResolvedValueOnce(
          new BrainArch1ToolResult({
            callId: 'call-1',
            success: true,
            output: 'file1 contents',
            error: null,
          }),
        )
        .mockResolvedValueOnce(
          new BrainArch1ToolResult({
            callId: 'call-2',
            success: true,
            output: 'file2 contents',
            error: null,
          }),
        ),
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

        const toolboxByToolName = new Map([['read', filesBox]]);

        const result = await iterateBrainArch1Loop(
          {
            atom,
            messages: initialMessages,
            definitions: [],
            toolboxByToolName,
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
        expect(filesBox.execute).toHaveBeenCalledTimes(2);
      });
    });
  });
});
