import fg from 'fast-glob';
import { z } from 'zod';

import {
  BrainArch1ToolDefinition,
  toJsonSchema,
} from '@src/domain.objects/BrainArch1/BrainArch1ToolDefinition';
import { BrainArch1ToolResult } from '@src/domain.objects/BrainArch1/BrainArch1ToolResult';

/**
 * .what = zod schema for glob tool input
 * .why = enables type-safe validation and json schema generation
 */
export const schemaGlobInput = z.object({
  pattern: z
    .string()
    .describe('The glob pattern to match files (e.g., "**/*.ts")'),
  cwd: z
    .string()
    .optional()
    .describe(
      'Optional working directory to search from. Defaults to process.cwd().',
    ),
});

/**
 * .what = tool definition for finding files by glob pattern
 * .why = enables the brain to discover files matching patterns
 */
export const toolDefinitionGlob = new BrainArch1ToolDefinition({
  name: 'glob',
  description:
    'Finds files matching a glob pattern. Returns matching file paths.',
  schema: {
    input: toJsonSchema(schemaGlobInput),
  },
  strict: false,
});

/**
 * .what = executes the glob tool
 * .why = performs the actual file pattern matching
 */
export const executeToolGlob = async (input: {
  callId: string;
  args: { pattern: string; cwd?: string };
}): Promise<BrainArch1ToolResult> => {
  try {
    // find matching files
    const matches = await fg(input.args.pattern, {
      cwd: input.args.cwd ?? process.cwd(),
      absolute: true,
      onlyFiles: true,
    });

    // format output
    const output =
      matches.length > 0 ? matches.join('\n') : 'no files matched the pattern';

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
      error: `failed to glob: ${error}`,
    });
  }
};
