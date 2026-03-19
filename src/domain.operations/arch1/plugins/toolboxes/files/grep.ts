import { exec } from 'child_process';
import { genBrainPlugToolDeclaration } from 'rhachet/brains';
import { promisify } from 'util';
import { z } from 'zod';

const execAsync = promisify(exec);

/**
 * .what = zod schema for grep tool input
 * .why = enables type-safe validation
 */
const schemaGrepInput = z.object({
  pattern: z.string().describe('The regex pattern to search for'),
  path: z
    .string()
    .optional()
    .describe(
      'The file or directory to search in. Defaults to current directory.',
    ),
  glob: z
    .string()
    .optional()
    .describe('Optional glob pattern to filter files (e.g., "*.ts")'),
  case_insensitive: z
    .boolean()
    .optional()
    .describe('If true, perform case-insensitive search'),
});

/**
 * .what = zod schema for grep tool output
 * .why = enables type-safe output validation
 */
const schemaGrepOutput = z.object({
  matches: z.string().describe('Matched lines with file paths'),
});

/**
 * .what = grep tool declaration via rhachet's factory
 * .why = enables the brain to search for text patterns in files
 */
export const toolGrep = genBrainPlugToolDeclaration({
  slug: 'grep',
  name: 'grep',
  description:
    'Search for a regex pattern in files. Returns matched lines with file paths.',
  schema: {
    input: schemaGrepInput,
    output: schemaGrepOutput,
  },
  execute: async ({ invocation }) => {
    // build rg command
    const args: string[] = ['rg'];

    // add pattern
    args.push('--regexp', invocation.input.pattern);

    // add case insensitive flag
    if (invocation.input.case_insensitive) {
      args.push('-i');
    }

    // add glob filter
    if (invocation.input.glob) {
      args.push('--glob', invocation.input.glob);
    }

    // add line numbers
    args.push('-n');

    // add path
    args.push(invocation.input.path ?? '.');

    try {
      // execute ripgrep
      const { stdout } = await execAsync(args.join(' '), {
        maxBuffer: 1024 * 1024 * 10, // 10MB
        cwd: process.cwd(),
      });

      return { matches: stdout.trim() || 'no matches found' };
    } catch (err) {
      // ripgrep returns exit code 1 when no matches found
      if (
        err instanceof Error &&
        'code' in err &&
        (err as NodeJS.ErrnoException).code === '1'
      ) {
        return { matches: 'no matches found' };
      }
      throw err;
    }
  },
});
