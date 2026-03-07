import type { BrainArch1Context } from './BrainArch1Context';
import type { BrainArch1ToolCall } from './BrainArch1ToolCall';
import type { BrainArch1ToolDefinition } from './BrainArch1ToolDefinition';
import type { BrainArch1ToolResult } from './BrainArch1ToolResult';

/**
 * .what = function signature for executing a tool call
 * .why = enables toolboxes to define custom execution logic
 */
export type BrainArch1ToolExecuteFn = (
  input: { call: BrainArch1ToolCall },
  context: BrainArch1Context,
) => Promise<BrainArch1ToolResult>;

/**
 * .what = interface for a toolbox plugin containing related tools
 * .why = enables pluggable tool sets (files, bash, websearch) with unified interface
 *
 * .note = this is an interface, not a DomainLiteral, because it contains functions
 */
export interface BrainArch1Toolbox {
  /**
   * name of this toolbox (e.g., 'files', 'bash', 'websearch')
   */
  name: string;

  /**
   * tool definitions for all tools in this box
   */
  definitions: BrainArch1ToolDefinition[];

  /**
   * execute a tool call (routes to appropriate tool handler)
   */
  execute: BrainArch1ToolExecuteFn;
}
