import { BadRequestError } from 'helpful-errors';
import type { BrainPlugToolDefinition } from 'rhachet/brains';

/**
 * .what = result of merged tool arrays
 * .why = provides tools array for llm and lookup map for execution
 */
export interface MergedBrainArch1Tools {
  tools: BrainPlugToolDefinition[];
  toolBySlug: Map<string, BrainPlugToolDefinition>;
}

/**
 * .what = merges multiple tool arrays into a unified collection
 * .why = enables brain to use tools from multiple sources with single interface
 *
 * .note = throws if duplicate tool slugs detected
 */
export const mergeBrainArch1Toolboxes = (input: {
  toolboxes: BrainPlugToolDefinition[][];
}): MergedBrainArch1Tools => {
  const tools: BrainPlugToolDefinition[] = [];
  const toolBySlug = new Map<string, BrainPlugToolDefinition>();

  // iterate through each toolbox array
  for (const toolbox of input.toolboxes) {
    // iterate through each tool in the array
    for (const tool of toolbox) {
      // check for duplicate tool slugs
      if (toolBySlug.has(tool.slug)) {
        throw new BadRequestError('duplicate tool slug across toolboxes', {
          toolSlug: tool.slug,
        });
      }

      // register the tool
      tools.push(tool);
      toolBySlug.set(tool.slug, tool);
    }
  }

  return { tools, toolBySlug };
};
