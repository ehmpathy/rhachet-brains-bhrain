import { given, then, when } from 'test-fns';

import { genMockBrainArch1Context } from '@src/.test/genMockBrainArch1Context';
import { BrainArch1PermissionDecision } from '@src/domain.objects/BrainArch1/BrainArch1PermissionDecision';
import type { BrainArch1PermissionGuard } from '@src/domain.objects/BrainArch1/BrainArch1PermissionGuard';
import type { BrainArch1Toolbox } from '@src/domain.objects/BrainArch1/BrainArch1Toolbox';
import { BrainArch1ToolCall } from '@src/domain.objects/BrainArch1/BrainArch1ToolCall';
import { BrainArch1ToolResult } from '@src/domain.objects/BrainArch1/BrainArch1ToolResult';

import { executeBrainArch1ToolCall } from './executeBrainArch1ToolCall';

/**
 * .what = unit tests for executeBrainArch1ToolCall
 * .why = verify permission checking and tool routing
 */
describe('executeBrainArch1ToolCall', () => {
  const getMockContext = genMockBrainArch1Context;

  const createMockToolbox = (
    name: string,
    toolNames: string[],
    executeResult: BrainArch1ToolResult,
  ): BrainArch1Toolbox => ({
    name,
    definitions: toolNames.map((tn) => ({
      name: tn,
      description: `${tn} description`,
      schema: {
        input: {
          type: 'object' as const,
          properties: {},
          required: [] as string[],
        },
      },
      strict: false,
    })),
    execute: jest.fn().mockResolvedValue(executeResult),
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
    const successResult = new BrainArch1ToolResult({
      callId: 'call-1',
      success: true,
      output: 'file contents here',
      error: null,
    });
    const filesBox = createMockToolbox(
      'files',
      ['read', 'write'],
      successResult,
    );
    const toolboxByToolName = new Map([
      ['read', filesBox],
      ['write', filesBox],
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
          { call, toolboxByToolName, permissionGuard: guard },
          getMockContext(),
        );

        expect(result.success).toBe(true);
        expect(result.output).toBe('file contents here');
        expect(filesBox.execute).toHaveBeenCalledWith(
          { call },
          expect.anything(),
        );
      });
    });
  });

  given('[case2] tool does not exist', () => {
    const toolboxByToolName = new Map<string, BrainArch1Toolbox>();
    const guard = createMockPermissionGuard('allow');

    when('[t0] execute is called with unknown tool', () => {
      then('returns error result with available tools', async () => {
        const call = new BrainArch1ToolCall({
          id: 'call-1',
          name: 'unknownTool',
          input: {},
        });

        const result = await executeBrainArch1ToolCall(
          { call, toolboxByToolName, permissionGuard: guard },
          getMockContext(),
        );

        expect(result.success).toBe(false);
        expect(result.output).toContain('not found');
      });
    });
  });

  given('[case3] permission is denied', () => {
    const filesBox = createMockToolbox(
      'files',
      ['read'],
      new BrainArch1ToolResult({
        callId: 'call-1',
        success: true,
        output: 'should not reach here',
        error: null,
      }),
    );
    const toolboxByToolName = new Map([['read', filesBox]]);
    const guard = createMockPermissionGuard('deny', 'dangerous operation');

    when('[t0] execute is called', () => {
      then('returns denial result without executing', async () => {
        const call = new BrainArch1ToolCall({
          id: 'call-1',
          name: 'read',
          input: { path: '/etc/passwd' },
        });

        const result = await executeBrainArch1ToolCall(
          { call, toolboxByToolName, permissionGuard: guard },
          getMockContext(),
        );

        expect(result.success).toBe(false);
        expect(result.output).toContain('permission denied');
        expect(result.output).toContain('dangerous operation');
        expect(filesBox.execute).not.toHaveBeenCalled();
      });
    });
  });

  given('[case4] permission requires prompt', () => {
    const filesBox = createMockToolbox(
      'files',
      ['write'],
      new BrainArch1ToolResult({
        callId: 'call-1',
        success: true,
        output: 'should not reach here',
        error: null,
      }),
    );
    const toolboxByToolName = new Map([['write', filesBox]]);
    const guard = createMockPermissionGuard(
      'prompt',
      'write operations require approval',
    );

    when('[t0] execute is called', () => {
      then('returns prompt result without executing', async () => {
        const call = new BrainArch1ToolCall({
          id: 'call-1',
          name: 'write',
          input: { path: '/test.txt', content: 'hello' },
        });

        const result = await executeBrainArch1ToolCall(
          { call, toolboxByToolName, permissionGuard: guard },
          getMockContext(),
        );

        expect(result.success).toBe(false);
        expect(result.output).toContain('requires user approval');
        expect(filesBox.execute).not.toHaveBeenCalled();
      });
    });
  });
});
