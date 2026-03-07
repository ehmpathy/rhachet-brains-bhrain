import { DomainEvent } from 'domain-objects';

import type { BrainArch1LoopIteration } from './BrainArch1LoopIteration';

/**
 * .what = event emitted when a loop iteration completes
 * .why = enables observability and logging of iteration progress
 */
export interface BrainArch1LoopIterationCompletedEvent {
  /**
   * session uuid this event belongs to
   */
  sessionUuid: string;

  /**
   * timestamp when this event occurred
   */
  occurredAt: string;

  /**
   * the completed iteration data
   */
  iteration: BrainArch1LoopIteration;
}

export class BrainArch1LoopIterationCompletedEvent
  extends DomainEvent<BrainArch1LoopIterationCompletedEvent>
  implements BrainArch1LoopIterationCompletedEvent
{
  public static unique = ['sessionUuid', 'iteration.iterationNumber'] as const;
}
