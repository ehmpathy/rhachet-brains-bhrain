import type { ContextLogTrail } from 'as-procedure';

/**
 * .what = runtime context containing provider-keyed credentials for llm apis
 * .why = enables dependency injection of credentials per provider
 *
 * .note = this is not a DomainLiteral because it contains functions (log)
 *         and is a runtime dependency injection container, not a serializable value
 */
export interface BrainArch1Context extends ContextLogTrail {
  /**
   * provider-keyed credentials for llm api access
   */
  creds: {
    anthropic: { apiKey: string; url: string | null };
    openai: { apiKey: string; url: string | null };
    qwen: { apiKey: string; url: string | null };
    tavily: { apiKey: string };
  };
}
