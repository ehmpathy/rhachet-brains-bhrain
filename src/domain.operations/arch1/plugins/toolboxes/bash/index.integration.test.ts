import { given, then, when } from 'test-fns';

import { genMockBrainArch1Context } from '@src/.test/genMockBrainArch1Context';

import { toolBashExec } from './exec';

const mockContext = genMockBrainArch1Context();

/**
 * .what = integration tests for bash toolbox
 * .why = verify bash exec tool works via BrainPlugToolExecution contract
 */
describe('toolboxBash', () => {
  given('[case1] exec tool', () => {
    when('[t0] a simple command is invoked', () => {
      then('returns stdout on success', async () => {
        const result = await toolBashExec.execute(
          {
            invocation: {
              exid: 'test-1',
              slug: 'bash_exec',
              input: { command: 'echo "hello world"' },
            },
          },
          mockContext,
        );

        expect(result.signal).toBe('success');
        if (result.signal === 'success') {
          expect(result.output.stdout).toContain('hello world');
        }
      });
    });

    when('[t1] command writes to stderr', () => {
      then('returns stderr on success', async () => {
        const result = await toolBashExec.execute(
          {
            invocation: {
              exid: 'test-2',
              slug: 'bash_exec',
              input: { command: 'echo "warning" >&2' },
            },
          },
          mockContext,
        );

        expect(result.signal).toBe('success');
        if (result.signal === 'success') {
          expect(result.output.stderr).toContain('warning');
        }
      });
    });

    when('[t2] command fails with non-zero exit', () => {
      then('returns error:malfunction', async () => {
        const result = await toolBashExec.execute(
          {
            invocation: {
              exid: 'test-3',
              slug: 'bash_exec',
              input: { command: 'exit 1' },
            },
          },
          mockContext,
        );

        expect(result.signal).toBe('error:malfunction');
      });
    });

    when('[t3] custom cwd is provided', () => {
      then('runs in specified directory', async () => {
        const result = await toolBashExec.execute(
          {
            invocation: {
              exid: 'test-4',
              slug: 'bash_exec',
              input: { command: 'pwd', cwd: '/tmp' },
            },
          },
          mockContext,
        );

        expect(result.signal).toBe('success');
        if (result.signal === 'success') {
          expect(result.output.stdout).toContain('/tmp');
        }
      });
    });

    when('[t4] command is absent', () => {
      then('returns error:malfunction', async () => {
        const result = await toolBashExec.execute(
          {
            invocation: {
              exid: 'test-5',
              slug: 'bash_exec',
              // intentionally missing command to test error handling
              input: { command: '' },
            },
          },
          mockContext,
        );

        expect(result.signal).toBe('error:malfunction');
      });
    });

    when('[t5] command produces no output', () => {
      then('returns empty stdout/stderr', async () => {
        const result = await toolBashExec.execute(
          {
            invocation: {
              exid: 'test-6',
              slug: 'bash_exec',
              input: { command: 'true' },
            },
          },
          mockContext,
        );

        expect(result.signal).toBe('success');
        if (result.signal === 'success') {
          expect(result.output.stdout).toBe('');
          expect(result.output.stderr).toBe('');
        }
      });
    });
  });
});
