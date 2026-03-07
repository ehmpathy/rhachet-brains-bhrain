import { DomainEvent } from 'domain-objects';

import type { BrainArch1MemoryCompactionResult } from './BrainArch1MemoryCompactionResult';

/**
 * .what = event emitted when memory compaction completes
 * .why = enables observability and logging of memory optimization
 */
export interface BrainArch1MemoryCompactedEvent {
  /**
   * session uuid this event belongs to
   */
  sessionUuid: string;

  /**
   * iteration number after which compaction occurred
   */
  afterIterationNumber: number;

  /**
   * timestamp when this event occurred
   */
  occurredAt: string;

  /**
   * the compaction result
   */
  result: BrainArch1MemoryCompactionResult;

  /**
   * name of the memory manager that performed compaction
   */
  managerName: string;
}

export class BrainArch1MemoryCompactedEvent
  extends DomainEvent<BrainArch1MemoryCompactedEvent>
  implements BrainArch1MemoryCompactedEvent
{
  public static unique = ['sessionUuid', 'afterIterationNumber'] as const;
}
