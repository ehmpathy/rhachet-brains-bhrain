import type { BrainArch1Context } from '@src/domain.objects/BrainArch1/BrainArch1Context';
import type { BrainArch1Toolbox } from '@src/domain.objects/BrainArch1/BrainArch1Toolbox';
import type { BrainArch1ToolCall } from '@src/domain.objects/BrainArch1/BrainArch1ToolCall';
import { BrainArch1ToolResult } from '@src/domain.objects/BrainArch1/BrainArch1ToolResult';

import { executeExec, toolDefinitionExec } from './exec';

/**
 * .what = toolbox for bash command execution
 * .why = enables agentic shell operations
 */
export const toolboxBash: BrainArch1Toolbox = {
  name: 'bash',
  definitions: [toolDefinitionExec],
  execute: async (
    input: { call: BrainArch1ToolCall },
    _context: BrainArch1Context,
  ) => {
    // route to the correct executor
    if (input.call.name === 'bash_exec') return executeExec(input);

    // unknown tool
    return new BrainArch1ToolResult({
      callId: input.call.id,
      success: false,
      output: '',
      error: `unknown bash tool '${input.call.name}'`,
    });
  },
};
