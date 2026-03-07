import type { BrainArch1Context } from './BrainArch1Context';
import type { BrainArch1MemoryCompactionResult } from './BrainArch1MemoryCompactionResult';
import type { BrainArch1SessionMessage } from './BrainArch1SessionMessage';

/**
 * .what = function signature for checking if compaction should occur
 * .why = enables memory managers to decide when to compact based on token usage
 */
export type BrainArch1MemoryShouldCompactFn = (
  input: {
    messages: BrainArch1SessionMessage[];
    currentTokens: number;
    maxTokens: number;
  },
  context: BrainArch1Context,
) => Promise<boolean>;

/**
 * .what = function signature for performing memory compaction
 * .why = enables pluggable compaction strategies (summarize, truncate, etc.)
 */
export type BrainArch1MemoryCompactFn = (
  input: {
    messages: BrainArch1SessionMessage[];
    currentTokens: number;
    targetTokens: number;
  },
  context: BrainArch1Context,
) => Promise<BrainArch1MemoryCompactionResult>;

/**
 * .what = interface for a memory manager plugin
 * .why = enables pluggable memory strategies to control context window optimization
 *
 * .note = this is an interface, not a DomainLiteral, because it contains functions
 */
export interface BrainArch1MemoryManager {
  /**
   * name of this memory manager
   */
  name: string;

  /**
   * description of what this manager does
   */
  description: string;

  /**
   * check whether compaction should occur
   */
  shouldCompact: BrainArch1MemoryShouldCompactFn;

  /**
   * perform memory compaction
   */
  compact: BrainArch1MemoryCompactFn;
}
