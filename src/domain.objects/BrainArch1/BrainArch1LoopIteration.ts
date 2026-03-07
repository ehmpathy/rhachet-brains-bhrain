import { DomainLiteral } from 'domain-objects';

import type { BrainArch1MemoryTokenUsage } from './BrainArch1MemoryTokenUsage';

/**
 * .what = captures the state and metrics of a single loop iteration
 * .why = enables tracking and observability of each iteration cycle
 */
export interface BrainArch1LoopIteration {
  /**
   * iteration number (0-indexed)
   */
  iterationNumber: number;

  /**
   * whether this iteration generated any tool calls
   */
  hadToolCalls: boolean;

  /**
   * number of tool calls generated in this iteration
   */
  toolCallCount: number;

  /**
   * token usage for the llm call in this iteration
   */
  tokenUsage: BrainArch1MemoryTokenUsage;

  /**
   * timestamp when this iteration started
   */
  startedAt: string;

  /**
   * timestamp when this iteration completed
   */
  completedAt: string;
}

export class BrainArch1LoopIteration
  extends DomainLiteral<BrainArch1LoopIteration>
  implements BrainArch1LoopIteration {}
