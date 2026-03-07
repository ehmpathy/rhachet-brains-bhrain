import { BrainArch1PermissionDecision } from '@src/domain.objects/BrainArch1/BrainArch1PermissionDecision';
import type { BrainArch1PermissionGuard } from '@src/domain.objects/BrainArch1/BrainArch1PermissionGuard';

/**
 * .what = permission guard that allows all tool calls
 * .why = provides a default permissive policy for trusted environments
 */
export const permissionGuardAllowAll: BrainArch1PermissionGuard = {
  name: 'allowAll',
  description: 'allows all tool operations without restriction',
  check: async () =>
    new BrainArch1PermissionDecision({ verdict: 'allow', reason: null }),
};
