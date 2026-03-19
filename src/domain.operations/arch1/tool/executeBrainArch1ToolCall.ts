import type { BrainPlugToolDefinition } from 'rhachet/brains';

import type { BrainArch1Context } from '@src/domain.objects/BrainArch1/BrainArch1Context';
import type { BrainArch1PermissionGuard } from '@src/domain.objects/BrainArch1/BrainArch1PermissionGuard';
import type { BrainArch1ToolCall } from '@src/domain.objects/BrainArch1/BrainArch1ToolCall';
import { BrainArch1ToolResult } from '@src/domain.objects/BrainArch1/BrainArch1ToolResult';

/**
 * .what = type for repl tools with execute function
 * .why = all tools in bhrain are repl grain with execute
 */
type ReplTool = BrainPlugToolDefinition<unknown, unknown, 'repl'>;

/**
 * .what = executes a tool call against the merged tools
 * .why = provides unified tool execution with permission check
 */
export const executeBrainArch1ToolCall = async (
  input: {
    call: BrainArch1ToolCall;
    toolBySlug: Map<string, BrainPlugToolDefinition>;
    permissionGuard: BrainArch1PermissionGuard;
  },
  context: BrainArch1Context,
): Promise<BrainArch1ToolResult> => {
  // find the tool for this call
  const tool = input.toolBySlug.get(input.call.name);
  if (!tool) {
    const availableTools = Array.from(input.toolBySlug.keys());
    return new BrainArch1ToolResult({
      callId: input.call.id,
      success: false,
      output: `tool "${input.call.name}" not found. available tools: ${availableTools.join(', ')}`,
      error: `tool not found: ${input.call.name}`,
    });
  }

  // check permission guard
  const decision = await input.permissionGuard.check(
    { call: input.call },
    context,
  );
  if (decision.verdict === 'deny') {
    return new BrainArch1ToolResult({
      callId: input.call.id,
      success: false,
      output: `permission denied: ${decision.reason ?? 'no reason provided'}`,
      error: 'permission denied',
    });
  }

  // handle prompt verdict (for now, treat as deny with explanation)
  if (decision.verdict === 'prompt') {
    return new BrainArch1ToolResult({
      callId: input.call.id,
      success: false,
      output: `permission requires user approval: ${decision.reason ?? 'no reason provided'}`,
      error: 'user approval required',
    });
  }

  // execute the tool directly via rhachet's unified interface
  // note: cast to ReplTool since all bhrain tools are created with genBrainPlugToolDeclaration
  try {
    const replTool = tool as ReplTool;
    const execution = await replTool.execute(
      {
        invocation: {
          exid: input.call.id,
          slug: tool.slug,
          input: input.call.input,
        },
      },
      context,
    );

    // check execution signal
    if (execution.signal === 'success') {
      return new BrainArch1ToolResult({
        callId: input.call.id,
        success: true,
        output: JSON.stringify(execution.output),
        error: null,
      });
    }

    // handle error signals
    return new BrainArch1ToolResult({
      callId: input.call.id,
      success: false,
      output: `tool execution failed: ${execution.signal}`,
      error: execution.signal,
    });
  } catch (error) {
    // handle unexpected errors
    const message = error instanceof Error ? error.message : String(error);
    return new BrainArch1ToolResult({
      callId: input.call.id,
      success: false,
      output: `tool execution error: ${message}`,
      error: message,
    });
  }
};
