import { BrainArch1PermissionDecision } from '@src/domain.objects/BrainArch1/BrainArch1PermissionDecision';
import type { BrainArch1PermissionGuard } from '@src/domain.objects/BrainArch1/BrainArch1PermissionGuard';

/**
 * .what = tools that require user approval before execution
 * .why = provides sensible defaults for which operations need explicit consent
 */
const PROMPT_REQUIRED_TOOLS = new Set([
  'bash_exec', // shell commands can be destructive
  'files_write', // file creation can overwrite
  'files_edit', // file modification can corrupt
]);

/**
 * .what = tools that are always safe to execute
 * .why = read-only operations don't need approval
 */
const ALWAYS_ALLOWED_TOOLS = new Set([
  'files_read', // reading files is safe
  'files_glob', // listing files is safe
  'files_grep', // searching files is safe
]);

/**
 * .what = permission guard that prompts user for sensitive operations
 * .why = balances automation with user control for potentially destructive actions
 *
 * .note = allows read-only operations, prompts for writes/executions
 */
export const permissionGuardPromptUser: BrainArch1PermissionGuard = {
  name: 'promptUser',
  description:
    'prompts for user approval on write/execute operations, allows read-only operations',

  check: async ({ call }) => {
    // allow read-only tools immediately
    if (ALWAYS_ALLOWED_TOOLS.has(call.name))
      return new BrainArch1PermissionDecision({
        verdict: 'allow',
        reason: null,
      });

    // prompt for known sensitive tools
    if (PROMPT_REQUIRED_TOOLS.has(call.name))
      return new BrainArch1PermissionDecision({
        verdict: 'prompt',
        reason: `tool '${call.name}' requires user approval`,
      });

    // default to prompting for unknown tools (fail-safe)
    return new BrainArch1PermissionDecision({
      verdict: 'prompt',
      reason: `unknown tool '${call.name}' requires user approval`,
    });
  },
};
