import { sdkQwen } from '@src/access/sdks/qwen/sdkQwen';
import type { BrainArch1Atom } from '@src/domain.objects/BrainArch1/BrainArch1Atom';

/**
 * .what = creates a qwen atom plugin for BrainArch1
 * .why = enables using qwen models with the brain architecture
 */
export const genAtomQwen = (input: { model: string }): BrainArch1Atom => ({
  platform: 'qwen',
  model: input.model,
  description: `qwen ${input.model} atom for llm generation`,
  generate: async (params, context) => {
    return sdkQwen.generate(
      {
        messages: params.messages,
        tools: params.tools,
        maxTokens: params.maxTokens,
      },
      {
        qwen: {
          auth: {
            key: context.creds.qwen.apiKey,
            url:
              context.creds.qwen.url ??
              'https://dashscope.aliyuncs.com/compatible-mode/v1',
          },
          llm: { model: input.model },
        },
        log: context.log,
      },
    );
  },
});
