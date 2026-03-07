import { DomainLiteral } from 'domain-objects';

import type { BrainArch1MemoryTokenUsage } from './BrainArch1MemoryTokenUsage';
import type { BrainArch1SessionMessage } from './BrainArch1SessionMessage';

/**
 * .what = captures the result of a memory compaction operation
 * .why = enables the loop to apply compacted context and track token reduction
 */
export interface BrainArch1MemoryCompactionResult {
  /**
   * the compacted messages to replace current context
   */
  messages: BrainArch1SessionMessage[];

  /**
   * token usage before compaction
   */
  tokensBefore: number;

  /**
   * token usage after compaction
   */
  tokensAfter: number;

  /**
   * tokens used for the compaction operation itself (e.g., summarization llm call)
   */
  compactionTokenUsage: BrainArch1MemoryTokenUsage | null;
}

export class BrainArch1MemoryCompactionResult
  extends DomainLiteral<BrainArch1MemoryCompactionResult>
  implements BrainArch1MemoryCompactionResult {}
