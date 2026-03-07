import * as fs from 'fs/promises';
import { z } from 'zod';

import {
  BrainArch1ToolDefinition,
  toJsonSchema,
} from '@src/domain.objects/BrainArch1/BrainArch1ToolDefinition';
import { BrainArch1ToolResult } from '@src/domain.objects/BrainArch1/BrainArch1ToolResult';

/**
 * .what = zod schema for edit tool input
 * .why = enables type-safe validation and json schema generation
 */
export const schemaEditInput = z.object({
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
 * .what = tool definition for editing file contents via string replacement
 * .why = enables the brain to make precise changes to existing files
 */
export const toolDefinitionEdit = new BrainArch1ToolDefinition({
  name: 'edit',
  description:
    'Performs exact string replacement in a file. The old_string must be unique in the file unless replace_all is true.',
  schema: {
    input: toJsonSchema(schemaEditInput),
  },
  strict: false,
});

/**
 * .what = executes the edit tool
 * .why = performs the actual file edit operation
 */
export const executeToolEdit = async (input: {
  callId: string;
  args: {
    path: string;
    old_string: string;
    new_string: string;
    replace_all?: boolean;
  };
}): Promise<BrainArch1ToolResult> => {
  try {
    // read current content
    const content = await fs.readFile(input.args.path, 'utf-8');

    // count occurrences
    const occurrences = content.split(input.args.old_string).length - 1;

    // validate uniqueness
    if (occurrences === 0) {
      return new BrainArch1ToolResult({
        callId: input.callId,
        success: false,
        output: '',
        error: 'old_string not found in file',
      });
    }

    if (occurrences > 1 && !input.args.replace_all) {
      return new BrainArch1ToolResult({
        callId: input.callId,
        success: false,
        output: '',
        error: `old_string found ${occurrences} times. use replace_all=true or provide more context.`,
      });
    }

    // perform replacement
    const newContent = input.args.replace_all
      ? content.split(input.args.old_string).join(input.args.new_string)
      : content.replace(input.args.old_string, input.args.new_string);

    // write updated content
    await fs.writeFile(input.args.path, newContent, 'utf-8');

    return new BrainArch1ToolResult({
      callId: input.callId,
      success: true,
      output: `replaced ${input.args.replace_all ? occurrences : 1} occurrence(s)`,
      error: null,
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return new BrainArch1ToolResult({
      callId: input.callId,
      success: false,
      output: '',
      error: `failed to edit file: ${error}`,
    });
  }
};
