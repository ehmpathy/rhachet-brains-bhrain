import { DomainLiteral } from 'domain-objects';

/**
 * .what = possible verdicts from a permission guard
 * .why = enables explicit control over tool execution authorization
 */
export type BrainArch1PermissionVerdict = 'allow' | 'deny' | 'prompt';

/**
 * .what = captures the decision from a permission guard for a tool call
 * .why = enables the brain to understand and react to permission decisions
 */
export interface BrainArch1PermissionDecision {
  /**
   * the verdict: allow (proceed), deny (reject), or prompt (ask user)
   */
  verdict: BrainArch1PermissionVerdict;

  /**
   * reason for the decision (useful for deny/prompt cases)
   */
  reason: string | null;
}

export class BrainArch1PermissionDecision
  extends DomainLiteral<BrainArch1PermissionDecision>
  implements BrainArch1PermissionDecision {}
