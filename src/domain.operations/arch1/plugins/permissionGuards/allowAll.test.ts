import { given, then, when } from 'test-fns';

import { genMockBrainArch1Context } from '@src/.test/genMockBrainArch1Context';
import { BrainArch1ToolCall } from '@src/domain.objects/BrainArch1/BrainArch1ToolCall';

import { permissionGuardAllowAll } from './allowAll';

/**
 * .what = unit tests for permissionGuardAllowAll
 * .why = verify allowAll guard always permits tool execution
 */
describe('permissionGuardAllowAll', () => {
  const getMockContext = genMockBrainArch1Context;

  given('[case1] any tool call', () => {
    when('[t0] check is called', () => {
      then('returns allow verdict', async () => {
        const call = new BrainArch1ToolCall({
          id: 'call-1',
          name: 'someRandomTool',
          input: { foo: 'bar' },
        });

        const decision = await permissionGuardAllowAll.check(
          { call },
          getMockContext(),
        );

        expect(decision.verdict).toBe('allow');
        expect(decision.reason).toBeNull();
      });
    });
  });

  given('[case2] dangerous tool call', () => {
    when('[t0] check is called with a destructive tool', () => {
      then('still returns allow verdict', async () => {
        const call = new BrainArch1ToolCall({
          id: 'call-2',
          name: 'deleteEverything',
          input: { confirm: true },
        });

        const decision = await permissionGuardAllowAll.check(
          { call },
          getMockContext(),
        );

        expect(decision.verdict).toBe('allow');
        expect(decision.reason).toBeNull();
      });
    });
  });

  given('[case3] guard metadata', () => {
    when('[t0] inspecting the guard', () => {
      then('has correct name', () => {
        expect(permissionGuardAllowAll.name).toBe('allowAll');
      });

      then('has description', () => {
        expect(permissionGuardAllowAll.description).toContain('allows all');
      });
    });
  });
});
