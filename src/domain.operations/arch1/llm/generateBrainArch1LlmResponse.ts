import type { BrainArch1Atom } from '@src/domain.objects/BrainArch1/BrainArch1Atom';
import type { BrainArch1Context } from '@src/domain.objects/BrainArch1/BrainArch1Context';
import type { BrainArch1MemoryTokenUsage } from '@src/domain.objects/BrainArch1/BrainArch1MemoryTokenUsage';
import type { BrainArch1SessionMessage } from '@src/domain.objects/BrainArch1/BrainArch1SessionMessage';
import type { BrainArch1ToolDefinition } from '@src/domain.objects/BrainArch1/BrainArch1ToolDefinition';

/**
 * .what = generates an llm response using the provided atom plugin
 * .why = delegates to atom.generate(), enabling brain to work with any atom implementation
 */
export const generateBrainArch1LlmResponse = async (
  input: {
    atom: BrainArch1Atom;
    messages: BrainArch1SessionMessage[];
    tools: BrainArch1ToolDefinition[];
    maxTokens?: number;
  },
  context: BrainArch1Context,
): Promise<{
  message: BrainArch1SessionMessage;
  tokenUsage: BrainArch1MemoryTokenUsage;
}> => {
  return input.atom.generate(
    {
      messages: input.messages,
      tools: input.tools,
      maxTokens: input.maxTokens,
    },
    context,
  );
};
