import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { given, then, when } from 'test-fns';

import { genMockBrainArch1Context } from '@src/.test/genMockBrainArch1Context';

import { toolEdit } from './edit';
import { toolGlob } from './glob';
import { toolRead } from './read';
import { toolWrite } from './write';

/**
 * .what = integration tests for files toolbox
 * .why = verify actual file operations work correctly via BrainPlugToolExecution contract
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
    when('[t0] file exists', () => {
      then('returns file contents with line numbers', async () => {
        // create test file
        const testFile = path.join(testDir, 'read-test.txt');
        await fs.writeFile(testFile, 'line 1\nline 2\nline 3');

        const result = await toolRead.execute(
          {
            invocation: {
              exid: 'call-1',
              slug: 'read',
              input: { path: testFile },
            },
          },
          getMockContext(),
        );

        expect(result.signal).toBe('success');
        if (result.signal === 'success') {
          expect(result.output.content).toContain('line 1');
          expect(result.output.content).toContain('line 2');
        }
      });
    });

    when('[t1] offset and limit provided', () => {
      then('returns only requested lines', async () => {
        const testFile = path.join(testDir, 'read-offset-test.txt');
        await fs.writeFile(testFile, 'line 1\nline 2\nline 3\nline 4\nline 5');

        const result = await toolRead.execute(
          {
            invocation: {
              exid: 'call-2',
              slug: 'read',
              input: { path: testFile, offset: 2, limit: 2 },
            },
          },
          getMockContext(),
        );

        expect(result.signal).toBe('success');
        if (result.signal === 'success') {
          expect(result.output.content).toContain('line 2');
          expect(result.output.content).toContain('line 3');
          expect(result.output.content).not.toContain('line 1');
          expect(result.output.content).not.toContain('line 4');
        }
      });
    });

    when('[t2] file does not exist', () => {
      then('returns error:malfunction', async () => {
        const result = await toolRead.execute(
          {
            invocation: {
              exid: 'call-3',
              slug: 'read',
              input: { path: '/nonexistent/file.txt' },
            },
          },
          getMockContext(),
        );

        expect(result.signal).toBe('error:malfunction');
      });
    });
  });

  given('[case2] write tool', () => {
    when('[t0] file is new', () => {
      then('creates file with content', async () => {
        const testFile = path.join(testDir, 'write-test.txt');

        const result = await toolWrite.execute(
          {
            invocation: {
              exid: 'call-4',
              slug: 'write',
              input: { path: testFile, content: 'hello world' },
            },
          },
          getMockContext(),
        );

        expect(result.signal).toBe('success');
        if (result.signal === 'success') {
          expect(result.output.message).toContain('wrote');
        }

        // verify file contents
        const content = await fs.readFile(testFile, 'utf-8');
        expect(content).toBe('hello world');
      });
    });

    when('[t1] nested directory does not exist', () => {
      then('creates directories and file', async () => {
        const testFile = path.join(testDir, 'nested', 'dir', 'file.txt');

        const result = await toolWrite.execute(
          {
            invocation: {
              exid: 'call-5',
              slug: 'write',
              input: { path: testFile, content: 'nested content' },
            },
          },
          getMockContext(),
        );

        expect(result.signal).toBe('success');

        // verify file contents
        const content = await fs.readFile(testFile, 'utf-8');
        expect(content).toBe('nested content');
      });
    });
  });

  given('[case3] edit tool', () => {
    when('[t0] old_string is unique', () => {
      then('replaces and saves', async () => {
        const testFile = path.join(testDir, 'edit-test.txt');
        await fs.writeFile(testFile, 'foo bar baz');

        const result = await toolEdit.execute(
          {
            invocation: {
              exid: 'call-6',
              slug: 'edit',
              input: { path: testFile, old_string: 'bar', new_string: 'BAR' },
            },
          },
          getMockContext(),
        );

        expect(result.signal).toBe('success');
        if (result.signal === 'success') {
          expect(result.output.message).toContain('replaced');
        }

        // verify file contents
        const content = await fs.readFile(testFile, 'utf-8');
        expect(content).toBe('foo BAR baz');
      });
    });

    when('[t1] replace_all is true', () => {
      then('replaces all occurrences', async () => {
        const testFile = path.join(testDir, 'edit-all-test.txt');
        await fs.writeFile(testFile, 'foo foo foo');

        const result = await toolEdit.execute(
          {
            invocation: {
              exid: 'call-7',
              slug: 'edit',
              input: {
                path: testFile,
                old_string: 'foo',
                new_string: 'bar',
                replace_all: true,
              },
            },
          },
          getMockContext(),
        );

        expect(result.signal).toBe('success');
        if (result.signal === 'success') {
          expect(result.output.message).toContain('3');
        }

        // verify file contents
        const content = await fs.readFile(testFile, 'utf-8');
        expect(content).toBe('bar bar bar');
      });
    });

    when('[t2] old_string not unique and replace_all is false', () => {
      then('returns error:constraint', async () => {
        const testFile = path.join(testDir, 'edit-dupe-test.txt');
        await fs.writeFile(testFile, 'foo foo foo');

        const result = await toolEdit.execute(
          {
            invocation: {
              exid: 'call-8',
              slug: 'edit',
              input: { path: testFile, old_string: 'foo', new_string: 'bar' },
            },
          },
          getMockContext(),
        );

        expect(result.signal).toBe('error:constraint');
      });
    });
  });

  given('[case4] glob tool', () => {
    when('[t0] pattern matches files', () => {
      then('returns matched paths', async () => {
        // create test files
        await fs.writeFile(path.join(testDir, 'glob1.ts'), '');
        await fs.writeFile(path.join(testDir, 'glob2.ts'), '');
        await fs.writeFile(path.join(testDir, 'glob3.js'), '');

        const result = await toolGlob.execute(
          {
            invocation: {
              exid: 'call-9',
              slug: 'glob',
              input: { pattern: '*.ts', cwd: testDir },
            },
          },
          getMockContext(),
        );

        expect(result.signal).toBe('success');
        if (result.signal === 'success') {
          expect(result.output.files).toContain('glob1.ts');
          expect(result.output.files).toContain('glob2.ts');
          expect(result.output.files).not.toContain('glob3.js');
        }
      });
    });

    when('[t1] no matches found', () => {
      then('returns no-match message', async () => {
        const result = await toolGlob.execute(
          {
            invocation: {
              exid: 'call-10',
              slug: 'glob',
              input: { pattern: '*.xyz', cwd: testDir },
            },
          },
          getMockContext(),
        );

        expect(result.signal).toBe('success');
        if (result.signal === 'success') {
          expect(result.output.files).toContain('no files matched');
        }
      });
    });
  });
});
