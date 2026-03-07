import * as fs from 'fs/promises';
import * as path from 'path';
import { z } from 'zod';

import {
  BrainArch1ToolDefinition,
  toJsonSchema,
} from '@src/domain.objects/BrainArch1/BrainArch1ToolDefinition';
import { BrainArch1ToolResult } from '@src/domain.objects/BrainArch1/BrainArch1ToolResult';

/**
 * .what = zod schema for write tool input
 * .why = enables type-safe validation and json schema generation
 */
export const schemaWriteInput = z.object({
  path: z.string().describe('The absolute path to the file to write'),
  content: z.string().describe('The content to write to the file'),
});

/**
 * .what = tool definition for writing file contents
 * .why = enables the brain to create or overwrite files
 */
export const toolDefinitionWrite = new BrainArch1ToolDefinition({
  name: 'write',
  description:
    'Writes content to a file at the specified path. Creates parent directories if needed. Overwrites existing files.',
  schema: {
    input: toJsonSchema(schemaWriteInput),
  },
  strict: false,
});

/**
 * .what = executes the write tool
 * .why = performs the actual file write operation
 */
export const executeToolWrite = async (input: {
  callId: string;
  args: { path: string; content: string };
}): Promise<BrainArch1ToolResult> => {
  try {
    // ensure parent directory exists
    const dir = path.dirname(input.args.path);
    await fs.mkdir(dir, { recursive: true });

    // write file contents
    await fs.writeFile(input.args.path, input.args.content, 'utf-8');

    return new BrainArch1ToolResult({
      callId: input.callId,
      success: true,
      output: `successfully wrote ${input.args.content.length} bytes to ${input.args.path}`,
      error: null,
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return new BrainArch1ToolResult({
      callId: input.callId,
      success: false,
      output: '',
      error: `failed to write file: ${error}`,
    });
  }
};
