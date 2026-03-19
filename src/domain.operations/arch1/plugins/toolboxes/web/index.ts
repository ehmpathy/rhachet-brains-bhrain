import type { BrainPlugToolDefinition } from 'rhachet/brains';

import { toolWebFetch } from './fetch';
import { toolWebSearch } from './search';

/**
 * .what = web toolbox as array of rhachet tool declarations
 * .why = enables the brain to research topics on the web
 */
export const toolboxWeb: BrainPlugToolDefinition[] = [
  toolWebSearch,
  toolWebFetch,
];
