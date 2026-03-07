import type { BrainArch1Context } from '@src/domain.objects/BrainArch1/BrainArch1Context';
import { genContextLogTrail } from './genContextLogTrail';

/**
 * .what = generates a mock BrainArch1Context for unit tests
 * .why = centralizes context shape so tests don't break when creds shape changes
 */
export const genMockBrainArch1Context = (): BrainArch1Context => ({
  creds: {
    anthropic: { apiKey: 'test', url: null },
    openai: { apiKey: 'test', url: null },
    qwen: { apiKey: 'test', url: null },
    tavily: { apiKey: 'test' },
  },
  ...genContextLogTrail(),
});
