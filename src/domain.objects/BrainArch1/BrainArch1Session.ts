import { DomainEntity } from 'domain-objects';

import type { BrainArch1MemoryTokenUsage } from './BrainArch1MemoryTokenUsage';
import type { BrainArch1SessionMessage } from './BrainArch1SessionMessage';

/**
 * .what = status of a brain session
 * .why = enables tracking session lifecycle
 */
export type BrainArch1SessionStatus = 'ACTIVE' | 'COMPLETED' | 'TERMINATED';

/**
 * .what = captures the state of an ongoing brain session
 * .why = enables tracking and managing the execution lifecycle
 */
export interface BrainArch1Session {
  /**
   * unique identifier for this session
   */
  uuid?: string;

  /**
   * current status of the session
   */
  status: BrainArch1SessionStatus;

  /**
   * number of loop iterations executed so far
   */
  iterationCount: number;

  /**
   * cumulative token usage across all iterations
   */
  totalTokenUsage: BrainArch1MemoryTokenUsage;

  /**
   * current conversation context
   */
  messages: BrainArch1SessionMessage[];

  /**
   * timestamp when session started
   */
  startedAt: string;

  /**
   * timestamp when session completed (null if still active)
   */
  completedAt: string | null;
}

export class BrainArch1Session
  extends DomainEntity<BrainArch1Session>
  implements BrainArch1Session
{
  public static primary = ['uuid'] as const;
  public static unique = ['uuid'] as const;
  public static updatable = [
    'status',
    'iterationCount',
    'totalTokenUsage',
    'messages',
    'completedAt',
  ] as const;
}
