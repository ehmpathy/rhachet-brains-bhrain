import * as fs from 'fs/promises';
import { genBrainPlugToolDeclaration } from 'rhachet/brains';
import { z } from 'zod';

/**
 * .what = zod schema for read tool input
 * .why = enables type-safe validation
 */
const schemaReadInput = z.object({
  path: z.string().describe('The absolute path to the file to read'),
  offset: z
    .number()
    .optional()
    .describe(
      'Optional line number to start read from (1-indexed). Defaults to 1.',
    ),
  limit: z
    .number()
    .optional()
    .describe(
      'Optional maximum number of lines to read. Defaults to all lines.',
    ),
});

/**
 * .what = zod schema for read tool output
 * .why = enables type-safe output validation
 */
const schemaReadOutput = z.object({
  content: z.string().describe('The file contents with line numbers'),
});

/**
 * .what = read tool declaration via rhachet's factory
 * .why = enables the brain to read files from the filesystem
 *
 * .note = uses genBrainPlugToolDeclaration for type-safe tool definition and execution
 */
export const toolRead = genBrainPlugToolDeclaration({
  slug: 'read',
  name: 'read',
  description:
    'Read the contents of a file at the specified path. Returns the file contents as a string.',
  schema: {
    input: schemaReadInput,
    output: schemaReadOutput,
  },
  execute: async ({ invocation }) => {
    // read file contents
    const content = await fs.readFile(invocation.input.path, 'utf-8');

    // handle offset and limit
    const lines = content.split('\n');
    const offset = invocation.input.offset ?? 1;
    const startIndex = Math.max(0, offset - 1);
    const endIndex = invocation.input.limit
      ? startIndex + invocation.input.limit
      : lines.length;

    const selectedLines = lines.slice(startIndex, endIndex);

    // format output with line numbers
    const formattedContent = selectedLines
      .map((line, i) => `${String(startIndex + i + 1).padStart(6)}→${line}`)
      .join('\n');

    return { content: formattedContent };
  },
});
