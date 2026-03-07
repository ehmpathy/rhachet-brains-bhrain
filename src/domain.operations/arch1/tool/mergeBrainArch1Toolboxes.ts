import { BadRequestError } from 'helpful-errors';

import type { BrainArch1Toolbox } from '@src/domain.objects/BrainArch1/BrainArch1Toolbox';
import type { BrainArch1ToolDefinition } from '@src/domain.objects/BrainArch1/BrainArch1ToolDefinition';

/**
 * .what = result of merging multiple tool boxes
 * .why = provides both definitions for llm and lookup for execution
 */
export interface MergedBrainArch1Toolboxes {
  definitions: BrainArch1ToolDefinition[];
  toolboxByToolName: Map<string, BrainArch1Toolbox>;
}

/**
 * .what = merges multiple tool boxes into a unified collection
 * .why = enables brain to use tools from multiple sources with single interface
 *
 * .note = throws if duplicate tool names detected
 */
export const mergeBrainArch1Toolboxes = (input: {
  toolboxes: BrainArch1Toolbox[];
}): MergedBrainArch1Toolboxes => {
  const definitions: BrainArch1ToolDefinition[] = [];
  const toolboxByToolName = new Map<string, BrainArch1Toolbox>();
  const seenToolNames = new Set<string>();

  // iterate through each toolbox
  for (const toolbox of input.toolboxes) {
    // iterate through each tool definition in the box
    for (const definition of toolbox.definitions) {
      // check for duplicate tool names
      if (seenToolNames.has(definition.name)) {
        throw new BadRequestError('duplicate tool name across toolboxes', {
          toolName: definition.name,
          toolboxName: toolbox.name,
        });
      }

      // register the tool
      seenToolNames.add(definition.name);
      definitions.push(definition);
      toolboxByToolName.set(definition.name, toolbox);
    }
  }

  return { definitions, toolboxByToolName };
};
