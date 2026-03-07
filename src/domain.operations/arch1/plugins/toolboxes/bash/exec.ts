import { exec } from 'child_process';
import { promisify } from 'util';
import { z } from 'zod';

import type { BrainArch1ToolCall } from '@src/domain.objects/BrainArch1/BrainArch1ToolCall';
import {
  BrainArch1ToolDefinition,
  toJsonSchema,
} from '@src/domain.objects/BrainArch1/BrainArch1ToolDefinition';
import { BrainArch1ToolResult } from '@src/domain.objects/BrainArch1/BrainArch1ToolResult';

const execAsync = promisify(exec);

/**
 * .what = zod schema for bash exec tool input
 * .why = enables type-safe validation and json schema generation
 */
export const schemaExecInput = z.object({
  command: z.string().describe('The bash command to execute'),
  cwd: z
    .string()
    .optional()
    .describe(
      'Working directory for the command. Defaults to current directory.',
    ),
  timeout: z
    .number()
    .optional()
    .describe('Timeout in milliseconds. Defaults to 30000 (30 seconds).'),
});

/**
 * .what = tool definition for executing bash commands
 * .why = enables agentic shell command execution
 */
export const toolDefinitionExec = new BrainArch1ToolDefinition({
  name: 'bash_exec',
  description:
    'Executes a bash command and returns stdout/stderr. Use for git, npm, system commands, etc.',
  schema: {
    input: toJsonSchema(schemaExecInput),
  },
  strict: false,
});

/**
 * .what = executes bash commands
 * .why = enables shell operations for agentic workflows
 */
export const executeExec = async (input: {
  call: BrainArch1ToolCall;
}): Promise<BrainArch1ToolResult> => {
  const args = input.call.input as {
    command: string;
    cwd?: string;
    timeout?: number;
  };

  // validate command is provided
  if (!args.command || typeof args.command !== 'string') {
    return new BrainArch1ToolResult({
      callId: input.call.id,
      success: false,
      output: '',
      error: 'command is required and must be a string',
    });
  }

  // execute the command
  try {
    const timeout = args.timeout ?? 30000;
    const cwd = args.cwd ?? process.cwd();

    const { stdout, stderr } = await execAsync(args.command, {
      cwd,
      timeout,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });

    // format output
    const output = [
      stdout ? `stdout:\n${stdout}` : null,
      stderr ? `stderr:\n${stderr}` : null,
    ]
      .filter(Boolean)
      .join('\n\n');

    return new BrainArch1ToolResult({
      callId: input.call.id,
      success: true,
      output: output || '(no output)',
      error: null,
    });
  } catch (error: unknown) {
    // handle exec errors (non-zero exit, timeout, etc)
    const execError = error as {
      message?: string;
      stdout?: string;
      stderr?: string;
      code?: number;
      killed?: boolean;
    };

    const output = [
      execError.stdout ? `stdout:\n${execError.stdout}` : null,
      execError.stderr ? `stderr:\n${execError.stderr}` : null,
    ]
      .filter(Boolean)
      .join('\n\n');

    const errorMsg = [
      execError.message ?? String(error),
      execError.code !== undefined ? `exit code: ${execError.code}` : null,
      execError.killed ? 'process was killed (timeout or signal)' : null,
    ]
      .filter(Boolean)
      .join('; ');

    return new BrainArch1ToolResult({
      callId: input.call.id,
      success: false,
      output: output || '',
      error: errorMsg,
    });
  }
};
