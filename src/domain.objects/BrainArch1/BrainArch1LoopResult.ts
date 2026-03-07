import { DomainLiteral } from 'domain-objects';

import type { BrainArch1LoopIteration } from './BrainArch1LoopIteration';
import type { BrainArch1MemoryTokenUsage } from './BrainArch1MemoryTokenUsage';
import type { BrainArch1SessionMessage } from './BrainArch1SessionMessage';

/**
 * .what = reason why the loop terminated
 * .why = enables the caller to understand loop completion state
 */
export type BrainArch1LoopTerminationReason =
  | 'NATURAL_COMPLETION' // loop ended with no tool calls
  | 'MAX_ITERATIONS' // loop hit iteration limit
  | 'ERROR'; // loop terminated due to error

/**
 * .what = captures the final result of a completed agentic loop
 * .why = enables the caller to receive the brain's output and metrics
 */
export interface BrainArch1LoopResult {
  /**
   * why the loop terminated
   */
  terminationReason: BrainArch1LoopTerminationReason;

  /**
   * final text response from the brain (may be null if error)
   */
  finalResponse: string | null;

  /**
   * final assistant message (includes tool calls if any)
   */
  finalMessage: BrainArch1SessionMessage | null;

  /**
   * all messages in the conversation context
   */
  messages: BrainArch1SessionMessage[];

  /**
   * history of all loop iterations
   */
  iterations: BrainArch1LoopIteration[];

  /**
   * total number of iterations executed
   */
  iterationCount: number;

  /**
   * cumulative token usage across all iterations
   */
  totalTokenUsage: BrainArch1MemoryTokenUsage;

  /**
   * error message if terminated due to error
   */
  error: string | null;
}

export class BrainArch1LoopResult
  extends DomainLiteral<BrainArch1LoopResult>
  implements BrainArch1LoopResult {}
