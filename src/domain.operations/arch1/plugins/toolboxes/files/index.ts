import type { BrainArch1Context } from '@src/domain.objects/BrainArch1/BrainArch1Context';
import type { BrainArch1Toolbox } from '@src/domain.objects/BrainArch1/BrainArch1Toolbox';
import type { BrainArch1ToolCall } from '@src/domain.objects/BrainArch1/BrainArch1ToolCall';
import { BrainArch1ToolResult } from '@src/domain.objects/BrainArch1/BrainArch1ToolResult';

import { executeToolEdit, toolDefinitionEdit } from './edit';
import { executeToolGlob, toolDefinitionGlob } from './glob';
import { executeToolGrep, toolDefinitionGrep } from './grep';
import { executeToolRead, toolDefinitionRead } from './read';
import { executeToolWrite, toolDefinitionWrite } from './write';

/**
 * .what = files toolbox providing read, write, edit, glob, and grep tools
 * .why = enables the brain to interact with the filesystem
 */
export const toolboxFiles: BrainArch1Toolbox = {
  name: 'files',
  definitions: [
    toolDefinitionRead,
    toolDefinitionWrite,
    toolDefinitionEdit,
    toolDefinitionGlob,
    toolDefinitionGrep,
  ],
  execute: async (
    input: { call: BrainArch1ToolCall },
    _context: BrainArch1Context,
  ): Promise<BrainArch1ToolResult> => {
    const { call } = input;

    // route to correct executor based on tool name
    if (call.name === 'read') {
      return executeToolRead({
        callId: call.id,
        args: call.input as { path: string; offset?: number; limit?: number },
      });
    }

    if (call.name === 'write') {
      return executeToolWrite({
        callId: call.id,
        args: call.input as { path: string; content: string },
      });
    }

    if (call.name === 'edit') {
      return executeToolEdit({
        callId: call.id,
        args: call.input as {
          path: string;
          old_string: string;
          new_string: string;
          replace_all?: boolean;
        },
      });
    }

    if (call.name === 'glob') {
      return executeToolGlob({
        callId: call.id,
        args: call.input as { pattern: string; cwd?: string },
      });
    }

    if (call.name === 'grep') {
      return executeToolGrep({
        callId: call.id,
        args: call.input as {
          pattern: string;
          path?: string;
          glob?: string;
          case_insensitive?: boolean;
        },
      });
    }

    // unknown tool
    return new BrainArch1ToolResult({
      callId: call.id,
      success: false,
      output: '',
      error: `unknown tool: ${call.name}`,
    });
  },
};
