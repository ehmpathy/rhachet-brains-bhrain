/**
 * .what = sdk exports for rhachet-brains-bhrain
 * .why = provides BrainRepl factory for bhrain's agentic brain
 *
 * composite slug pattern: bhrain/arch1@$atom
 *   - bhrain/arch1@claude/sonnet
 *   - bhrain/arch1@xai/grok
 *   - bhrain/arch1 alone is invalid (repl requires atom)
 */

// re-export types from rhachet for convenience
export type { BrainEpisode, BrainOutput, BrainRepl } from 'rhachet';

// BrainRepl factory (the public interface)
export { genBrainRepl } from '../../domain.operations/brain.repl/genBrainRepl';
