import { exec } from 'child_process';
import { BadRequestError } from 'helpful-errors';
import { genBrainPlugToolDeclaration } from 'rhachet/brains';
import { promisify } from 'util';
import { z } from 'zod';

const execAsync = promisify(exec);

/**
 * .what = zod schema for bash exec tool input
 * .why = enables type-safe validation
 */
const schemaExecInput = z.object({
  command: z.string().describe('The bash command to execute'),
  cwd: z
    .string()
    .optional()
    .describe('Work directory for the command. Defaults to current directory.'),
  timeout: z
    .number()
    .optional()
    .describe('Timeout in milliseconds. Defaults to 30000 (30 seconds).'),
});

/**
 * .what = zod schema for bash exec tool output
 * .why = enables type-safe output validation
 */
const schemaExecOutput = z.object({
  stdout: z.string().describe('Standard output from command'),
  stderr: z.string().describe('Standard error from command'),
});

/**
 * .what = bash exec tool declaration via rhachet's factory
 * .why = enables agentic shell command execution
 */
export const toolBashExec = genBrainPlugToolDeclaration({
  slug: 'bash_exec',
  name: 'bash_exec',
  description:
    'Execute a bash command and return stdout/stderr. Use for git, npm, system commands, etc.',
  schema: {
    input: schemaExecInput,
    output: schemaExecOutput,
  },
  execute: async ({ invocation }) => {
    // validate command is provided
    if (
      !invocation.input.command ||
      typeof invocation.input.command !== 'string'
    )
      throw new BadRequestError('command is required and must be a string');

    // execute the command
    const timeout = invocation.input.timeout ?? 30000;
    const cwd = invocation.input.cwd ?? process.cwd();

    try {
      const { stdout, stderr } = await execAsync(invocation.input.command, {
        cwd,
        timeout,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      return {
        stdout: stdout || '',
        stderr: stderr || '',
      };
    } catch (error: unknown) {
      // handle exec errors (non-zero exit, timeout, etc)
      const execError = error as {
        message?: string;
        stdout?: string;
        stderr?: string;
        code?: number;
        killed?: boolean;
      };

      const errorMsg = [
        execError.message ?? String(error),
        execError.code !== undefined ? `exit code: ${execError.code}` : null,
        execError.killed ? 'process was killed (timeout or signal)' : null,
      ]
        .filter(Boolean)
        .join('; ');

      throw new BadRequestError(errorMsg, {
        stdout: execError.stdout ?? '',
        stderr: execError.stderr ?? '',
      });
    }
  },
});
