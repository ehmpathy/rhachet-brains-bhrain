import * as fs from 'fs/promises';
import * as path from 'path';
import { genBrainPlugToolDeclaration } from 'rhachet/brains';
import { z } from 'zod';

/**
 * .what = zod schema for write tool input
 * .why = enables type-safe validation
 */
const schemaWriteInput = z.object({
  path: z.string().describe('The absolute path to the file to write'),
  content: z.string().describe('The content to write to the file'),
});

/**
 * .what = zod schema for write tool output
 * .why = enables type-safe output validation
 */
const schemaWriteOutput = z.object({
  message: z.string().describe('Status message about the write operation'),
});

/**
 * .what = write tool declaration via rhachet's factory
 * .why = enables the brain to create or overwrite files
 */
export const toolWrite = genBrainPlugToolDeclaration({
  slug: 'write',
  name: 'write',
  description:
    'Write content to a file at the specified path. Creates parent directories if needed. Overwrites extant files.',
  schema: {
    input: schemaWriteInput,
    output: schemaWriteOutput,
  },
  execute: async ({ invocation }) => {
    // ensure parent directory exists
    const dir = path.dirname(invocation.input.path);
    await fs.mkdir(dir, { recursive: true });

    // write file contents
    await fs.writeFile(
      invocation.input.path,
      invocation.input.content,
      'utf-8',
    );

    return {
      message: `wrote ${invocation.input.content.length} bytes to ${invocation.input.path}`,
    };
  },
});
