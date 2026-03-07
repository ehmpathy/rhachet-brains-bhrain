import { DomainLiteral } from 'domain-objects';

/**
 * .what = tracks token consumption for a single llm api call
 * .why = enables monitoring context usage and triggering memory compaction
 */
export interface BrainArch1MemoryTokenUsage {
  /**
   * tokens consumed by the input/prompt
   */
  inputTokens: number;

  /**
   * tokens generated in the output/response
   */
  outputTokens: number;

  /**
   * total tokens used (input + output)
   */
  totalTokens: number;

  /**
   * tokens read from cache, if applicable
   */
  cacheReadTokens: number | null;

  /**
   * tokens written to cache, if applicable
   */
  cacheWriteTokens: number | null;
}

export class BrainArch1MemoryTokenUsage
  extends DomainLiteral<BrainArch1MemoryTokenUsage>
  implements BrainArch1MemoryTokenUsage {}
