import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { given, then, when } from 'test-fns';

import { genMockBrainArch1Context } from '@src/.test/genMockBrainArch1Context';
import { BrainArch1ToolCall } from '@src/domain.objects/BrainArch1/BrainArch1ToolCall';

import { toolboxFiles } from './index';

/**
 * .what = integration tests for files toolbox
 * .why = verify actual file operations work correctly
 */
describe('toolboxFiles', () => {
  const getMockContext = genMockBrainArch1Context;

  let testDir: string;

  beforeAll(async () => {
    // create temp directory for tests
    testDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'brain-arch1-files-test-'),
    );
  });

  afterAll(async () => {
    // cleanup temp directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  given('[case1] read tool', () => {
    when('[t0] reading an existing file', () => {
      then('returns file contents with line numbers', async () => {
        // create test file
        const testFile = path.join(testDir, 'read-test.txt');
        await fs.writeFile(testFile, 'line 1\nline 2\nline 3');

        const call = new BrainArch1ToolCall({
          id: 'call-1',
          name: 'read',
          input: { path: testFile },
        });

        const result = await toolboxFiles.execute({ call }, getMockContext());

        expect(result.success).toBe(true);
        expect(result.output).toContain('line 1');
        expect(result.output).toContain('line 2');
        expect(result.error).toBeNull();
      });
    });

    when('[t1] reading with offset and limit', () => {
      then('returns only requested lines', async () => {
        const testFile = path.join(testDir, 'read-offset-test.txt');
        await fs.writeFile(testFile, 'line 1\nline 2\nline 3\nline 4\nline 5');

        const call = new BrainArch1ToolCall({
          id: 'call-2',
          name: 'read',
          input: { path: testFile, offset: 2, limit: 2 },
        });

        const result = await toolboxFiles.execute({ call }, getMockContext());

        expect(result.success).toBe(true);
        expect(result.output).toContain('line 2');
        expect(result.output).toContain('line 3');
        expect(result.output).not.toContain('line 1');
        expect(result.output).not.toContain('line 4');
      });
    });

    when('[t2] reading non-existent file', () => {
      then('returns error', async () => {
        const call = new BrainArch1ToolCall({
          id: 'call-3',
          name: 'read',
          input: { path: '/nonexistent/file.txt' },
        });

        const result = await toolboxFiles.execute({ call }, getMockContext());

        expect(result.success).toBe(false);
        expect(result.error).toContain('failed to read file');
      });
    });
  });

  given('[case2] write tool', () => {
    when('[t0] writing a new file', () => {
      then('creates file with content', async () => {
        const testFile = path.join(testDir, 'write-test.txt');

        const call = new BrainArch1ToolCall({
          id: 'call-4',
          name: 'write',
          input: { path: testFile, content: 'hello world' },
        });

        const result = await toolboxFiles.execute({ call }, getMockContext());

        expect(result.success).toBe(true);
        expect(result.output).toContain('11 bytes');

        // verify file contents
        const content = await fs.readFile(testFile, 'utf-8');
        expect(content).toBe('hello world');
      });
    });

    when('[t1] writing with nested directory creation', () => {
      then('creates directories and file', async () => {
        const testFile = path.join(testDir, 'nested', 'dir', 'file.txt');

        const call = new BrainArch1ToolCall({
          id: 'call-5',
          name: 'write',
          input: { path: testFile, content: 'nested content' },
        });

        const result = await toolboxFiles.execute({ call }, getMockContext());

        expect(result.success).toBe(true);

        // verify file contents
        const content = await fs.readFile(testFile, 'utf-8');
        expect(content).toBe('nested content');
      });
    });
  });

  given('[case3] edit tool', () => {
    when('[t0] replacing unique string', () => {
      then('replaces and saves', async () => {
        const testFile = path.join(testDir, 'edit-test.txt');
        await fs.writeFile(testFile, 'foo bar baz');

        const call = new BrainArch1ToolCall({
          id: 'call-6',
          name: 'edit',
          input: { path: testFile, old_string: 'bar', new_string: 'BAR' },
        });

        const result = await toolboxFiles.execute({ call }, getMockContext());

        expect(result.success).toBe(true);
        expect(result.output).toContain('replaced 1');

        // verify file contents
        const content = await fs.readFile(testFile, 'utf-8');
        expect(content).toBe('foo BAR baz');
      });
    });

    when('[t1] replacing with replace_all', () => {
      then('replaces all occurrences', async () => {
        const testFile = path.join(testDir, 'edit-all-test.txt');
        await fs.writeFile(testFile, 'foo foo foo');

        const call = new BrainArch1ToolCall({
          id: 'call-7',
          name: 'edit',
          input: {
            path: testFile,
            old_string: 'foo',
            new_string: 'bar',
            replace_all: true,
          },
        });

        const result = await toolboxFiles.execute({ call }, getMockContext());

        expect(result.success).toBe(true);
        expect(result.output).toContain('replaced 3');

        // verify file contents
        const content = await fs.readFile(testFile, 'utf-8');
        expect(content).toBe('bar bar bar');
      });
    });

    when('[t2] old_string not unique and replace_all is false', () => {
      then('returns error', async () => {
        const testFile = path.join(testDir, 'edit-dupe-test.txt');
        await fs.writeFile(testFile, 'foo foo foo');

        const call = new BrainArch1ToolCall({
          id: 'call-8',
          name: 'edit',
          input: { path: testFile, old_string: 'foo', new_string: 'bar' },
        });

        const result = await toolboxFiles.execute({ call }, getMockContext());

        expect(result.success).toBe(false);
        expect(result.error).toContain('found 3 times');
      });
    });
  });

  given('[case4] glob tool', () => {
    when('[t0] globbing existing files', () => {
      then('returns matching paths', async () => {
        // create test files
        await fs.writeFile(path.join(testDir, 'glob1.ts'), '');
        await fs.writeFile(path.join(testDir, 'glob2.ts'), '');
        await fs.writeFile(path.join(testDir, 'glob3.js'), '');

        const call = new BrainArch1ToolCall({
          id: 'call-9',
          name: 'glob',
          input: { pattern: '*.ts', cwd: testDir },
        });

        const result = await toolboxFiles.execute({ call }, getMockContext());

        expect(result.success).toBe(true);
        expect(result.output).toContain('glob1.ts');
        expect(result.output).toContain('glob2.ts');
        expect(result.output).not.toContain('glob3.js');
      });
    });

    when('[t1] no matches found', () => {
      then('returns no matches message', async () => {
        const call = new BrainArch1ToolCall({
          id: 'call-10',
          name: 'glob',
          input: { pattern: '*.xyz', cwd: testDir },
        });

        const result = await toolboxFiles.execute({ call }, getMockContext());

        expect(result.success).toBe(true);
        expect(result.output).toContain('no files matched');
      });
    });
  });

  given('[case5] unknown tool', () => {
    when('[t0] calling undefined tool', () => {
      then('returns error', async () => {
        const call = new BrainArch1ToolCall({
          id: 'call-11',
          name: 'unknownTool',
          input: {},
        });

        const result = await toolboxFiles.execute({ call }, getMockContext());

        expect(result.success).toBe(false);
        expect(result.error).toContain('unknown tool');
      });
    });
  });
});
