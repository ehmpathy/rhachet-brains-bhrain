import type { BrainPlugToolDefinition } from 'rhachet/brains';

import { toolBashExec } from './exec';

/**
 * .what = bash toolbox as array of rhachet tool declarations
 * .why = enables agentic shell operations
 */
export const toolboxBash: BrainPlugToolDefinition[] = [toolBashExec];
