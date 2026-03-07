import { BrainArch1PermissionDecision } from '@src/domain.objects/BrainArch1/BrainArch1PermissionDecision';
import type { BrainArch1PermissionGuard } from '@src/domain.objects/BrainArch1/BrainArch1PermissionGuard';

/**
 * .what = tools that are safe to execute without prompting
 * .why = read-only operations don't modify state and are always safe
 */
const ALLOWED_TOOLS = new Set([
  'files_read', // reading files is safe
  'files_glob', // listing files is safe
  'files_grep', // searching files is safe
  'websearch', // searching the web is safe
]);

/**
 * .what = permission guard that allows read-only operations, prompts for all else
 * .why = provides a safe default that enables exploration without risk of modification
 *
 * .note = this is the recommended default permission guard
 */
export const permissionGuardReadOnly: BrainArch1PermissionGuard = {
  name: 'readOnly',
  description:
    'allows read-only operations (file reads, web searches), prompts for all else',

  check: async ({ call }) => {
    // allow read-only tools immediately
    if (ALLOWED_TOOLS.has(call.name))
      return new BrainArch1PermissionDecision({
        verdict: 'allow',
        reason: null,
      });

    // prompt for everything else
    return new BrainArch1PermissionDecision({
      verdict: 'prompt',
      reason: `tool '${call.name}' requires user approval`,
    });
  },
};
