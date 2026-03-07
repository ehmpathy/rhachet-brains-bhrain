import { given, then, when } from 'test-fns';

import { genMockBrainArch1Context } from '@src/.test/genMockBrainArch1Context';
import { BrainArch1ToolCall } from '@src/domain.objects/BrainArch1/BrainArch1ToolCall';

import { permissionGuardPromptUser } from './promptUser';

const mockContext = genMockBrainArch1Context();

describe('permissionGuardPromptUser', () => {
  given('[case1] read-only tool calls', () => {
    when('[t0] calling files_read', () => {
      then('returns allow verdict', async () => {
        const call = new BrainArch1ToolCall({
          id: 'test-1',
          name: 'files_read',
          input: { path: '/some/file.txt' },
        });

        const decision = await permissionGuardPromptUser.check(
          { call },
          mockContext,
        );

        expect(decision.verdict).toBe('allow');
        expect(decision.reason).toBeNull();
      });
    });

    when('[t1] calling files_glob', () => {
      then('returns allow verdict', async () => {
        const call = new BrainArch1ToolCall({
          id: 'test-2',
          name: 'files_glob',
          input: { pattern: '**/*.ts' },
        });

        const decision = await permissionGuardPromptUser.check(
          { call },
          mockContext,
        );

        expect(decision.verdict).toBe('allow');
      });
    });

    when('[t2] calling files_grep', () => {
      then('returns allow verdict', async () => {
        const call = new BrainArch1ToolCall({
          id: 'test-3',
          name: 'files_grep',
          input: { pattern: 'TODO', path: '.' },
        });

        const decision = await permissionGuardPromptUser.check(
          { call },
          mockContext,
        );

        expect(decision.verdict).toBe('allow');
      });
    });
  });

  given('[case2] write/execute tool calls', () => {
    when('[t0] calling bash_exec', () => {
      then('returns prompt verdict', async () => {
        const call = new BrainArch1ToolCall({
          id: 'test-4',
          name: 'bash_exec',
          input: { command: 'rm -rf /' },
        });

        const decision = await permissionGuardPromptUser.check(
          { call },
          mockContext,
        );

        expect(decision.verdict).toBe('prompt');
        expect(decision.reason).toContain('bash_exec');
        expect(decision.reason).toContain('requires user approval');
      });
    });

    when('[t1] calling files_write', () => {
      then('returns prompt verdict', async () => {
        const call = new BrainArch1ToolCall({
          id: 'test-5',
          name: 'files_write',
          input: { path: '/etc/passwd', content: 'hacked' },
        });

        const decision = await permissionGuardPromptUser.check(
          { call },
          mockContext,
        );

        expect(decision.verdict).toBe('prompt');
        expect(decision.reason).toContain('files_write');
      });
    });

    when('[t2] calling files_edit', () => {
      then('returns prompt verdict', async () => {
        const call = new BrainArch1ToolCall({
          id: 'test-6',
          name: 'files_edit',
          input: { path: 'file.ts', old_string: 'foo', new_string: 'bar' },
        });

        const decision = await permissionGuardPromptUser.check(
          { call },
          mockContext,
        );

        expect(decision.verdict).toBe('prompt');
        expect(decision.reason).toContain('files_edit');
      });
    });
  });

  given('[case3] unknown tool calls', () => {
    when('[t0] calling an unknown tool', () => {
      then('returns prompt verdict (fail-safe)', async () => {
        const call = new BrainArch1ToolCall({
          id: 'test-7',
          name: 'unknown_dangerous_tool',
          input: {},
        });

        const decision = await permissionGuardPromptUser.check(
          { call },
          mockContext,
        );

        expect(decision.verdict).toBe('prompt');
        expect(decision.reason).toContain('unknown tool');
        expect(decision.reason).toContain('unknown_dangerous_tool');
      });
    });
  });

  given('[case4] guard metadata', () => {
    when('[t0] inspecting the guard', () => {
      then('has correct name', () => {
        expect(permissionGuardPromptUser.name).toBe('promptUser');
      });

      then('has description', () => {
        expect(permissionGuardPromptUser.description).toBeTruthy();
        expect(permissionGuardPromptUser.description).toContain('prompt');
      });
    });
  });
});
