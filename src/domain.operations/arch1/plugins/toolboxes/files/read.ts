import * as fs from 'fs/promises';
import { z } from 'zod';

import {
  BrainArch1ToolDefinition,
  toJsonSchema,
} from '@src/domain.objects/BrainArch1/BrainArch1ToolDefinition';
import { BrainArch1ToolResult } from '@src/domain.objects/BrainArch1/BrainArch1ToolResult';

/**
 * .what = zod schema for read tool input
 * .why = enables type-safe validation and json schema generation
 */
export const schemaReadInput = z.object({
  path: z.string().describe('The absolute path to the file to read'),
  offset: z
    .number()
    .optional()
    .describe(
      'Optional line number to start reading from (1-indexed). Defaults to 1.',
    ),
  limit: z
    .number()
    .optional()
    .describe(
      'Optional maximum number of lines to read. Defaults to all lines.',
    ),
});

/**
 * .what = tool definition for reading file contents
 * .why = enables the brain to read files from the filesystem
 */
export const toolDefinitionRead = new BrainArch1ToolDefinition({
  name: 'read',
  description:
    'Reads the contents of a file at the specified path. Returns the file contents as a string.',
  schema: {
    input: toJsonSchema(schemaReadInput),
  },
  strict: false,
});

/**
 * .what = executes the read tool
 * .why = performs the actual file read operation
 */
export const executeToolRead = async (input: {
  callId: string;
  args: { path: string; offset?: number; limit?: number };
}): Promise<BrainArch1ToolResult> => {
  try {
    // read file contents
    const content = await fs.readFile(input.args.path, 'utf-8');

    // handle offset and limit
    const lines = content.split('\n');
    const offset = input.args.offset ?? 1;
    const startIndex = Math.max(0, offset - 1);
    const endIndex = input.args.limit
      ? startIndex + input.args.limit
      : lines.length;

    const selectedLines = lines.slice(startIndex, endIndex);

    // format output with line numbers
    const output = selectedLines
      .map((line, i) => `${String(startIndex + i + 1).padStart(6)}→${line}`)
      .join('\n');

    return new BrainArch1ToolResult({
      callId: input.callId,
      success: true,
      output,
      error: null,
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return new BrainArch1ToolResult({
      callId: input.callId,
      success: false,
      output: '',
      error: `failed to read file: ${error}`,
    });
  }
};
