import type { BrainPlugToolDefinition } from 'rhachet/brains';
import { given, then, when } from 'test-fns';
import { z } from 'zod';

import { genMockBrainArch1Context } from '@src/.test/genMockBrainArch1Context';
import { BrainArch1PermissionDecision } from '@src/domain.objects/BrainArch1/BrainArch1PermissionDecision';
import type { BrainArch1PermissionGuard } from '@src/domain.objects/BrainArch1/BrainArch1PermissionGuard';
import { BrainArch1ToolCall } from '@src/domain.objects/BrainArch1/BrainArch1ToolCall';

import { executeBrainArch1ToolCall } from './executeBrainArch1ToolCall';

/**
 * .what = unit tests for executeBrainArch1ToolCall
 * .why = verify permission check and tool execution
 */
describe('executeBrainArch1ToolCall', () => {
  const getMockContext = genMockBrainArch1Context;

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

  const createMockPermissionGuard = (
    verdict: 'allow' | 'deny' | 'prompt',
    reason: string | null = null,
  ): BrainArch1PermissionGuard => ({
    name: 'mockGuard',
    description: 'mock permission guard',
    check: jest
      .fn()
      .mockResolvedValue(new BrainArch1PermissionDecision({ verdict, reason })),
  });

  given('[case1] tool exists and permission is allowed', () => {
    const readTool = createMockTool('read', { content: 'file contents here' });
    const writeTool = createMockTool('write', { success: true });
    const toolBySlug = new Map([
      ['read', readTool],
      ['write', writeTool],
    ]);
    const guard = createMockPermissionGuard('allow');

    when('[t0] execute is called with valid tool', () => {
      then('returns successful result', async () => {
        const call = new BrainArch1ToolCall({
          id: 'call-1',
          name: 'read',
          input: { path: '/test.txt' },
        });

        const result = await executeBrainArch1ToolCall(
          { call, toolBySlug, permissionGuard: guard },
          getMockContext(),
        );

        expect(result.success).toBe(true);
        expect(result.output).toContain('file contents here');
        expect(readTool.execute).toHaveBeenCalledWith(
          {
            invocation: {
              exid: 'call-1',
              slug: 'read',
              input: { path: '/test.txt' },
            },
          },
          expect.anything(),
        );
      });
    });
  });

  given('[case2] tool does not exist', () => {
    const toolBySlug = new Map<string, BrainPlugToolDefinition>();
    const guard = createMockPermissionGuard('allow');

    when('[t0] execute is called with unknown tool', () => {
      then('returns error result with available tools', async () => {
        const call = new BrainArch1ToolCall({
          id: 'call-1',
          name: 'unknownTool',
          input: {},
        });

        const result = await executeBrainArch1ToolCall(
          { call, toolBySlug, permissionGuard: guard },
          getMockContext(),
        );

        expect(result.success).toBe(false);
        expect(result.output).toContain('not found');
      });
    });
  });

  given('[case3] permission is denied', () => {
    const readTool = createMockTool('read', { content: 'should not reach' });
    const toolBySlug = new Map([['read', readTool]]);
    const guard = createMockPermissionGuard('deny', 'dangerous operation');

    when('[t0] execute is called', () => {
      then('returns denial result without execution', async () => {
        const call = new BrainArch1ToolCall({
          id: 'call-1',
          name: 'read',
          input: { path: '/etc/passwd' },
        });

        const result = await executeBrainArch1ToolCall(
          { call, toolBySlug, permissionGuard: guard },
          getMockContext(),
        );

        expect(result.success).toBe(false);
        expect(result.output).toContain('permission denied');
        expect(result.output).toContain('dangerous operation');
        expect(readTool.execute).not.toHaveBeenCalled();
      });
    });
  });

  given('[case4] permission requires prompt', () => {
    const writeTool = createMockTool('write', { success: true });
    const toolBySlug = new Map([['write', writeTool]]);
    const guard = createMockPermissionGuard(
      'prompt',
      'write operations require approval',
    );

    when('[t0] execute is called', () => {
      then('returns prompt result without execution', async () => {
        const call = new BrainArch1ToolCall({
          id: 'call-1',
          name: 'write',
          input: { path: '/test.txt', content: 'hello' },
        });

        const result = await executeBrainArch1ToolCall(
          { call, toolBySlug, permissionGuard: guard },
          getMockContext(),
        );

        expect(result.success).toBe(false);
        expect(result.output).toContain('requires user approval');
        expect(writeTool.execute).not.toHaveBeenCalled();
      });
    });
  });
});
