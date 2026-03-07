import { getError, given, then, when } from 'test-fns';

import type { BrainArch1Toolbox } from '@src/domain.objects/BrainArch1/BrainArch1Toolbox';
import { BrainArch1ToolDefinition } from '@src/domain.objects/BrainArch1/BrainArch1ToolDefinition';
import { BrainArch1ToolResult } from '@src/domain.objects/BrainArch1/BrainArch1ToolResult';

import { mergeBrainArch1Toolboxes } from './mergeBrainArch1Toolboxes';

/**
 * .what = unit tests for mergeBrainArch1Toolboxes
 * .why = verify correct merging and duplicate detection
 */
describe('mergeBrainArch1Toolboxes', () => {
  const createMockToolbox = (
    name: string,
    tools: { name: string; description: string }[],
  ): BrainArch1Toolbox => ({
    name,
    definitions: tools.map(
      (t) =>
        new BrainArch1ToolDefinition({
          name: t.name,
          description: t.description,
          schema: { input: { type: 'object', properties: {}, required: [] } },
          strict: false,
        }),
    ),
    execute: async () =>
      new BrainArch1ToolResult({
        callId: 'test',
        success: true,
        output: 'mock output',
        error: null,
      }),
  });

  given('[case1] multiple toolboxes with distinct tools', () => {
    const filesBox = createMockToolbox('files', [
      { name: 'read', description: 'read file' },
      { name: 'write', description: 'write file' },
    ]);
    const bashBox = createMockToolbox('bash', [
      { name: 'execute', description: 'run bash command' },
    ]);

    when('[t0] merge is called', () => {
      then('returns merged definitions', () => {
        const result = mergeBrainArch1Toolboxes({
          toolboxes: [filesBox, bashBox],
        });

        expect(result.definitions).toHaveLength(3);
        expect(result.definitions.map((d) => d.name)).toEqual([
          'read',
          'write',
          'execute',
        ]);
      });

      then('maps each tool to its toolbox', () => {
        const result = mergeBrainArch1Toolboxes({
          toolboxes: [filesBox, bashBox],
        });

        expect(result.toolboxByToolName.get('read')).toBe(filesBox);
        expect(result.toolboxByToolName.get('write')).toBe(filesBox);
        expect(result.toolboxByToolName.get('execute')).toBe(bashBox);
      });
    });
  });

  given('[case2] empty toolboxes array', () => {
    when('[t0] merge is called', () => {
      then('returns empty definitions', () => {
        const result = mergeBrainArch1Toolboxes({ toolboxes: [] });

        expect(result.definitions).toHaveLength(0);
        expect(result.toolboxByToolName.size).toBe(0);
      });
    });
  });

  given('[case3] toolboxes with duplicate tool names', () => {
    const box1 = createMockToolbox('files', [
      { name: 'read', description: 'read from files' },
    ]);
    const box2 = createMockToolbox('network', [
      { name: 'read', description: 'read from network' },
    ]);

    when('[t0] merge is called', () => {
      then('throws bad request error', async () => {
        const error = await getError(async () =>
          mergeBrainArch1Toolboxes({ toolboxes: [box1, box2] }),
        );

        expect(error).toBeDefined();
        expect(error?.message).toContain('duplicate tool name');
      });
    });
  });

  given('[case4] single toolbox', () => {
    const singleBox = createMockToolbox('files', [
      { name: 'read', description: 'read file' },
    ]);

    when('[t0] merge is called', () => {
      then('returns single toolbox definitions', () => {
        const result = mergeBrainArch1Toolboxes({ toolboxes: [singleBox] });

        expect(result.definitions).toHaveLength(1);
        expect(result.toolboxByToolName.get('read')).toBe(singleBox);
      });
    });
  });
});
