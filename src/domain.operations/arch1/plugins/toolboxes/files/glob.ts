import fg from 'fast-glob';
import { genBrainPlugToolDeclaration } from 'rhachet/brains';
import { z } from 'zod';

/**
 * .what = zod schema for glob tool input
 * .why = enables type-safe validation
 */
const schemaGlobInput = z.object({
  pattern: z
    .string()
    .describe('The glob pattern to match files (e.g., "**/*.ts")'),
  cwd: z
    .string()
    .optional()
    .describe(
      'Optional work directory to search from. Defaults to process.cwd().',
    ),
});

/**
 * .what = zod schema for glob tool output
 * .why = enables type-safe output validation
 */
const schemaGlobOutput = z.object({
  files: z.string().describe('Matched file paths, one per line'),
});

/**
 * .what = glob tool declaration via rhachet's factory
 * .why = enables the brain to discover files that match patterns
 */
export const toolGlob = genBrainPlugToolDeclaration({
  slug: 'glob',
  name: 'glob',
  description: 'Find files that match a glob pattern. Returns file paths.',
  schema: {
    input: schemaGlobInput,
    output: schemaGlobOutput,
  },
  execute: async ({ invocation }) => {
    // find matches
    const matches = await fg(invocation.input.pattern, {
      cwd: invocation.input.cwd ?? process.cwd(),
      absolute: true,
      onlyFiles: true,
    });

    // format output
    const files =
      matches.length > 0 ? matches.join('\n') : 'no files matched the pattern';

    return { files };
  },
});
