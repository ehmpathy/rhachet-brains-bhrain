import { DomainLiteral } from 'domain-objects';

import type { BrainArch1Atom } from './BrainArch1Atom';
import type { BrainArch1MemoryManager } from './BrainArch1MemoryManager';
import type { BrainArch1PermissionGuard } from './BrainArch1PermissionGuard';
import type { BrainArch1Toolbox } from './BrainArch1Toolbox';

/**
 * .what = instantiates a specific actor which will use the BrainArch1 architecture
 * .why = enables configuring an actor with plugins (atom, tools, memory, permissions)
 *        that the brain loop will leverage to enable action
 *
 * .note = the difference between actor & agent is that agency is granted only after
 *         a real user delegates responsibilities to the actor. so we can't say it's
 *         an agent here yet (since it could be readonly with no delegated responsibilities).
 *         but we know for sure it's an actor.
 */
export interface BrainArch1Repl {
  /**
   * the llm atom plugin to use for generation
   *
   * .todo = support an atom plugin that chooses which model to use based on
   *         context, task complexity, cost optimization, etc. Today we only support
   *         using one atom for the entire session.
   */
  atom: BrainArch1Atom;

  /**
   * the role this actor should take
   *
   * .todo = support rhachet roles more fundamentally
   */
  role: {
    /**
     * system prompt to prepend to conversation (null for default)
     */
    systemPrompt: string | null;
  };

  /**
   * constraints on actor execution
   */
  constraints: {
    /**
     * maximum iterations before forced termination
     */
    maxIterations: number;

    /**
     * maximum tokens for context window
     */
    maxTokens: number;
  };

  /**
   * toolboxes available to the actor
   */
  toolboxes: BrainArch1Toolbox[];

  /**
   * memory manager plugin for context optimization
   */
  memory: BrainArch1MemoryManager | null;

  /**
   * permission guard plugin for tool execution authorization
   */
  permission: BrainArch1PermissionGuard | null;
}

export class BrainArch1Repl
  extends DomainLiteral<BrainArch1Repl>
  implements BrainArch1Repl
{
  public static nested = {
    role: DomainLiteral,
    constraints: DomainLiteral,
  };
}
