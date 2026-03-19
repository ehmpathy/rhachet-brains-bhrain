import type { BrainPlugToolDefinition } from 'rhachet/brains';

import { toolEdit } from './edit';
import { toolGlob } from './glob';
import { toolGrep } from './grep';
import { toolRead } from './read';
import { toolWrite } from './write';

/**
 * .what = files toolbox as array of rhachet tool declarations
 * .why = enables the brain to interact with the filesystem
 */
export const toolboxFiles: BrainPlugToolDefinition[] = [
  toolRead,
  toolWrite,
  toolEdit,
  toolGlob,
  toolGrep,
];
