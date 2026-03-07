import { DomainLiteral } from 'domain-objects';

/**
 * .what = captures the result of a tool execution
 * .why = enables appending tool output to conversation context
 */
export interface BrainArch1ToolResult {
  /**
   * id of the tool call this result responds to
   */
  callId: string;

  /**
   * whether the tool execution succeeded
   */
  success: boolean;

  /**
   * output content from the tool (string for llm consumption)
   */
  output: string;

  /**
   * error message if execution failed
   */
  error: string | null;
}

export class BrainArch1ToolResult
  extends DomainLiteral<BrainArch1ToolResult>
  implements BrainArch1ToolResult {}
