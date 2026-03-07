import type { BrainArch1Context } from './BrainArch1Context';
import type { BrainArch1PermissionDecision } from './BrainArch1PermissionDecision';
import type { BrainArch1ToolCall } from './BrainArch1ToolCall';

/**
 * .what = function signature for checking permission on a tool call
 * .why = enables pluggable permission policies (allowAll, promptForWrites, denyDangerous)
 */
export type BrainArch1PermissionCheckFn = (
  input: { call: BrainArch1ToolCall },
  context: BrainArch1Context,
) => Promise<BrainArch1PermissionDecision>;

/**
 * .what = interface for a permission guard plugin
 * .why = enables pluggable permission strategies to control tool execution
 *
 * .note = this is an interface, not a DomainLiteral, because it contains functions
 */
export interface BrainArch1PermissionGuard {
  /**
   * name of this permission guard
   */
  name: string;

  /**
   * description of what this guard does
   */
  description: string;

  /**
   * check whether a tool call is permitted
   */
  check: BrainArch1PermissionCheckFn;
}
