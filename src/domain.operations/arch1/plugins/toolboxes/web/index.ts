import type { BrainArch1Context } from '@src/domain.objects/BrainArch1/BrainArch1Context';
import type { BrainArch1Toolbox } from '@src/domain.objects/BrainArch1/BrainArch1Toolbox';
import type { BrainArch1ToolCall } from '@src/domain.objects/BrainArch1/BrainArch1ToolCall';
import { BrainArch1ToolResult } from '@src/domain.objects/BrainArch1/BrainArch1ToolResult';

import { executeToolFetch, toolDefinitionFetch } from './fetch';
import { executeToolSearch, toolDefinitionSearch } from './search';

/**
 * .what = web toolbox providing search and fetch capabilities
 * .why = enables the brain to research topics on the web
 */
export const toolboxWeb: BrainArch1Toolbox = {
  name: 'web',
  definitions: [toolDefinitionSearch, toolDefinitionFetch],
  execute: async (
    input: { call: BrainArch1ToolCall },
    _context: BrainArch1Context,
  ): Promise<BrainArch1ToolResult> => {
    const { call } = input;

    // route to correct executor based on tool name
    if (call.name === 'websearch')
      return executeToolSearch(
        {
          callId: call.id,
          args: call.input as { query: string; num_results?: number },
        },
        _context,
      );

    if (call.name === 'webfetch')
      return executeToolFetch({
        callId: call.id,
        args: call.input as { url: string; max_length?: number },
      });

    // unknown tool
    return new BrainArch1ToolResult({
      callId: call.id,
      success: false,
      output: '',
      error: `unknown web tool '${call.name}'`,
    });
  },
};
