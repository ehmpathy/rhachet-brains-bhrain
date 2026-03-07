import type { BrainArch1Context } from '@src/domain.objects/BrainArch1/BrainArch1Context';
import type { BrainArch1PermissionGuard } from '@src/domain.objects/BrainArch1/BrainArch1PermissionGuard';
import type { BrainArch1Toolbox } from '@src/domain.objects/BrainArch1/BrainArch1Toolbox';
import type { BrainArch1ToolCall } from '@src/domain.objects/BrainArch1/BrainArch1ToolCall';
import { BrainArch1ToolResult } from '@src/domain.objects/BrainArch1/BrainArch1ToolResult';

/**
 * .what = executes a tool call against the merged toolboxes
 * .why = provides unified tool execution with permission checking
 */
export const executeBrainArch1ToolCall = async (
  input: {
    call: BrainArch1ToolCall;
    toolboxByToolName: Map<string, BrainArch1Toolbox>;
    permissionGuard: BrainArch1PermissionGuard;
  },
  context: BrainArch1Context,
): Promise<BrainArch1ToolResult> => {
  // find the toolbox for this tool
  const toolbox = input.toolboxByToolName.get(input.call.name);
  if (!toolbox) {
    const availableTools = Array.from(input.toolboxByToolName.keys());
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

  // execute the tool via its toolbox
  const result = await toolbox.execute({ call: input.call }, context);

  return result;
};
