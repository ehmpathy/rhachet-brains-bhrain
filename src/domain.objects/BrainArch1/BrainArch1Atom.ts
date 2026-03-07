import type { BrainArch1Context } from './BrainArch1Context';
import type { BrainArch1MemoryTokenUsage } from './BrainArch1MemoryTokenUsage';
import type { BrainArch1SessionMessage } from './BrainArch1SessionMessage';
import type { BrainArch1ToolDefinition } from './BrainArch1ToolDefinition';

/**
 * .what = plugin interface for llm atom generation
 * .why = enables swappable atoms (claude, qwen, openai) with same brain structure
 *
 * .note = this is a plugin interface - implementations are instantiated with their
 *         provider-specific configuration and expose a unified `.generate()` method
 *
 * .todo = support a meta-atom plugin that chooses which model to use based on
 *         context, task complexity, cost optimization, etc. Today we only support
 *         using one atom for the entire session.
 */
export interface BrainArch1Atom {
  /**
   * the platform this atom uses (e.g., 'anthropic', 'openai', 'qwen')
   */
  platform: string;

  /**
   * the model this atom uses (e.g., 'claude-3-5-sonnet-latest', 'gpt-4o')
   */
  model: string;

  /**
   * human-readable description of this atom
   */
  description: string;

  /**
   * generates an llm response using this atom's platform and model
   */
  generate: (
    input: {
      messages: BrainArch1SessionMessage[];
      tools: BrainArch1ToolDefinition[];
      maxTokens?: number;
    },
    context: BrainArch1Context,
  ) => Promise<{
    message: BrainArch1SessionMessage;
    tokenUsage: BrainArch1MemoryTokenUsage;
  }>;
}
