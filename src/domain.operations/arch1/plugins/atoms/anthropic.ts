import { sdkAnthropic } from '@src/access/sdks/anthropic/sdkAnthropic';
import type { BrainArch1Atom } from '@src/domain.objects/BrainArch1/BrainArch1Atom';

/**
 * .what = creates an anthropic atom plugin for BrainArch1
 * .why = enables using anthropic models (claude) with the brain architecture
 */
export const genAtomAnthropic = (input: { model: string }): BrainArch1Atom => ({
  platform: 'anthropic',
  model: input.model,
  description: `anthropic ${input.model} atom for llm generation`,
  generate: async (params, context) => {
    return sdkAnthropic.generate(
      {
        messages: params.messages,
        tools: params.tools,
        maxTokens: params.maxTokens,
      },
      {
        anthropic: {
          auth: {
            key: context.creds.anthropic.apiKey,
            url: context.creds.anthropic.url ?? undefined,
          },
          llm: { model: input.model },
        },
        log: context.log,
      },
    );
  },
});
