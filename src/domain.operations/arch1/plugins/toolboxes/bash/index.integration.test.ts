import { given, then, when } from 'test-fns';

import { genMockBrainArch1Context } from '@src/.test/genMockBrainArch1Context';
import { BrainArch1ToolCall } from '@src/domain.objects/BrainArch1/BrainArch1ToolCall';

import { toolboxBash } from './index';

const mockContext = genMockBrainArch1Context();

describe('toolboxBash', () => {
  given('[case1] exec tool', () => {
    when('[t0] executing a simple command', () => {
      then('returns stdout', async () => {
        const call = new BrainArch1ToolCall({
          id: 'test-1',
          name: 'bash_exec',
          input: { command: 'echo "hello world"' },
        });

        const result = await toolboxBash.execute({ call }, mockContext);

        expect(result.success).toBe(true);
        expect(result.output).toContain('hello world');
      });
    });

    when('[t1] executing a command that writes to stderr', () => {
      then('returns stderr', async () => {
        const call = new BrainArch1ToolCall({
          id: 'test-2',
          name: 'bash_exec',
          input: { command: 'echo "warning" >&2' },
        });

        const result = await toolboxBash.execute({ call }, mockContext);

        expect(result.success).toBe(true);
        expect(result.output).toContain('stderr');
        expect(result.output).toContain('warning');
      });
    });

    when('[t2] executing a command that fails', () => {
      then('returns error', async () => {
        const call = new BrainArch1ToolCall({
          id: 'test-3',
          name: 'bash_exec',
          input: { command: 'exit 1' },
        });

        const result = await toolboxBash.execute({ call }, mockContext);

        expect(result.success).toBe(false);
        expect(result.error).toBeTruthy();
        expect(result.error).toContain('Command failed');
      });
    });

    when('[t3] executing with custom cwd', () => {
      then('runs in specified directory', async () => {
        const call = new BrainArch1ToolCall({
          id: 'test-4',
          name: 'bash_exec',
          input: { command: 'pwd', cwd: '/tmp' },
        });

        const result = await toolboxBash.execute({ call }, mockContext);

        expect(result.success).toBe(true);
        expect(result.output).toContain('/tmp');
      });
    });

    when('[t4] command is missing', () => {
      then('returns error', async () => {
        const call = new BrainArch1ToolCall({
          id: 'test-5',
          name: 'bash_exec',
          input: {},
        });

        const result = await toolboxBash.execute({ call }, mockContext);

        expect(result.success).toBe(false);
        expect(result.error).toContain('command is required');
      });
    });

    when('[t5] executing a command that produces no output', () => {
      then('returns no output message', async () => {
        const call = new BrainArch1ToolCall({
          id: 'test-6',
          name: 'bash_exec',
          input: { command: 'true' },
        });

        const result = await toolboxBash.execute({ call }, mockContext);

        expect(result.success).toBe(true);
        expect(result.output).toBe('(no output)');
      });
    });
  });

  given('[case2] unknown tool', () => {
    when('[t0] calling undefined tool', () => {
      then('returns error', async () => {
        const call = new BrainArch1ToolCall({
          id: 'test-7',
          name: 'bash_unknown',
          input: {},
        });

        const result = await toolboxBash.execute({ call }, mockContext);

        expect(result.success).toBe(false);
        expect(result.error).toContain("unknown bash tool 'bash_unknown'");
      });
    });
  });
});
