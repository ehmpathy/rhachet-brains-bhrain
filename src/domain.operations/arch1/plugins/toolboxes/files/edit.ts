import * as fs from 'fs/promises';
import { BadRequestError } from 'helpful-errors';
import { genBrainPlugToolDeclaration } from 'rhachet/brains';
import { z } from 'zod';

/**
 * .what = zod schema for edit tool input
 * .why = enables type-safe validation
 */
const schemaEditInput = z.object({
  path: z.string().describe('The absolute path to the file to edit'),
  old_string: z.string().describe('The exact string to find and replace'),
  new_string: z.string().describe('The string to replace it with'),
  replace_all: z
    .boolean()
    .optional()
    .describe(
      'If true, replace all occurrences. Otherwise, fail if multiple matches.',
    ),
});

/**
 * .what = zod schema for edit tool output
 * .why = enables type-safe output validation
 */
const schemaEditOutput = z.object({
  message: z.string().describe('Status message about the edit operation'),
});

/**
 * .what = edit tool declaration via rhachet's factory
 * .why = enables the brain to make precise changes to extant files
 */
export const toolEdit = genBrainPlugToolDeclaration({
  slug: 'edit',
  name: 'edit',
  description:
    'Perform exact string replacement in a file. The old_string must be unique in the file unless replace_all is true.',
  schema: {
    input: schemaEditInput,
    output: schemaEditOutput,
  },
  execute: async ({ invocation }) => {
    // read current content
    const content = await fs.readFile(invocation.input.path, 'utf-8');

    // count occurrences
    const occurrences = content.split(invocation.input.old_string).length - 1;

    // validate uniqueness
    if (occurrences === 0)
      throw new BadRequestError('old_string not found in file', {
        path: invocation.input.path,
      });

    if (occurrences > 1 && !invocation.input.replace_all)
      throw new BadRequestError(
        `old_string found ${occurrences} times. use replace_all=true or provide more context.`,
        { path: invocation.input.path, occurrences },
      );

    // perform replacement
    const newContent = invocation.input.replace_all
      ? content
          .split(invocation.input.old_string)
          .join(invocation.input.new_string)
      : content.replace(
          invocation.input.old_string,
          invocation.input.new_string,
        );

    // write updated content
    await fs.writeFile(invocation.input.path, newContent, 'utf-8');

    return {
      message: `replaced ${invocation.input.replace_all ? occurrences : 1} occurrence(s)`,
    };
  },
});
