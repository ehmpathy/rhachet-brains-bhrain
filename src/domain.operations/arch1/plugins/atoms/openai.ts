import { sdkOpenAi } from '@src/access/sdk/sdkOpenAi';
import type { BrainArch1Atom } from '@src/domain.objects/BrainArch1/BrainArch1Atom';

/**
 * .what = creates an openai atom plugin for BrainArch1
 * .why = enables using openai models (gpt-4, etc) with the brain architecture
 */
export const genAtomOpenai = (input: { model: string }): BrainArch1Atom => ({
  platform: 'openai',
  model: input.model,
  description: `openai ${input.model} atom for llm generation`,
  generate: async (params, context) => {
    return sdkOpenAi.generate(
      {
        messages: params.messages,
        tools: params.tools,
        maxTokens: params.maxTokens,
      },
      {
        openai: {
          auth: {
            key: context.creds.openai.apiKey,
            url: context.creds.openai.url ?? undefined,
          },
          llm: { model: input.model },
        },
        log: context.log,
      },
    );
  },
});
