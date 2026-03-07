import { exec } from 'child_process';
import { promisify } from 'util';
import { z } from 'zod';

import {
  BrainArch1ToolDefinition,
  toJsonSchema,
} from '@src/domain.objects/BrainArch1/BrainArch1ToolDefinition';
import { BrainArch1ToolResult } from '@src/domain.objects/BrainArch1/BrainArch1ToolResult';

const execAsync = promisify(exec);

/**
 * .what = zod schema for grep tool input
 * .why = enables type-safe validation and json schema generation
 */
export const schemaGrepInput = z.object({
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
 * .what = tool definition for searching file contents by pattern
 * .why = enables the brain to search for text patterns in files
 */
export const toolDefinitionGrep = new BrainArch1ToolDefinition({
  name: 'grep',
  description:
    'Searches for a regex pattern in files. Returns matching lines with file paths.',
  schema: {
    input: toJsonSchema(schemaGrepInput),
  },
  strict: false,
});

/**
 * .what = executes the grep tool
 * .why = performs the actual content search operation
 */
export const executeToolGrep = async (input: {
  callId: string;
  args: {
    pattern: string;
    path?: string;
    glob?: string;
    case_insensitive?: boolean;
  };
}): Promise<BrainArch1ToolResult> => {
  try {
    // build rg command
    const args: string[] = ['rg'];

    // add pattern
    args.push('--regexp', input.args.pattern);

    // add case insensitive flag
    if (input.args.case_insensitive) {
      args.push('-i');
    }

    // add glob filter
    if (input.args.glob) {
      args.push('--glob', input.args.glob);
    }

    // add line numbers
    args.push('-n');

    // add path
    args.push(input.args.path ?? '.');

    // execute ripgrep
    const { stdout } = await execAsync(args.join(' '), {
      maxBuffer: 1024 * 1024 * 10, // 10MB
      cwd: process.cwd(),
    });

    return new BrainArch1ToolResult({
      callId: input.callId,
      success: true,
      output: stdout.trim() || 'no matches found',
      error: null,
    });
  } catch (err) {
    // ripgrep returns exit code 1 when no matches found
    if (
      err instanceof Error &&
      'code' in err &&
      (err as NodeJS.ErrnoException).code === '1'
    ) {
      return new BrainArch1ToolResult({
        callId: input.callId,
        success: true,
        output: 'no matches found',
        error: null,
      });
    }

    const error = err instanceof Error ? err.message : String(err);
    return new BrainArch1ToolResult({
      callId: input.callId,
      success: false,
      output: '',
      error: `failed to grep: ${error}`,
    });
  }
};
