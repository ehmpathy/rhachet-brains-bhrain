import type { BrainPlugToolDefinition } from 'rhachet/brains';
import { getError, given, then, when } from 'test-fns';
import { z } from 'zod';

import { mergeBrainArch1Toolboxes } from './mergeBrainArch1Toolboxes';

/**
 * .what = unit tests for mergeBrainArch1Toolboxes
 * .why = verify correct merge and duplicate detection
 */
describe('mergeBrainArch1Toolboxes', () => {
  const createMockTool = (
    slug: string,
    description: string,
  ): BrainPlugToolDefinition<unknown, unknown, 'repl'> => ({
    slug,
    name: slug,
    description,
    schema: { input: z.object({}), output: z.unknown() },
    execute: jest.fn().mockResolvedValue({
      signal: 'success' as const,
      output: { result: 'mock' },
      time: { ms: 1 },
    }),
  });

  given('[case1] multiple toolboxes with distinct tools', () => {
    const filesToolbox: BrainPlugToolDefinition<unknown, unknown, 'repl'>[] = [
      createMockTool('read', 'read file'),
      createMockTool('write', 'write file'),
    ];
    const bashToolbox: BrainPlugToolDefinition<unknown, unknown, 'repl'>[] = [
      createMockTool('bash_exec', 'run bash command'),
    ];

    when('[t0] merge is called', () => {
      then('returns merged tools', () => {
        const result = mergeBrainArch1Toolboxes({
          toolboxes: [filesToolbox, bashToolbox],
        });

        expect(result.tools).toHaveLength(3);
        expect(result.tools.map((d) => d.slug)).toEqual([
          'read',
          'write',
          'bash_exec',
        ]);
      });

      then('maps each tool by slug', () => {
        const result = mergeBrainArch1Toolboxes({
          toolboxes: [filesToolbox, bashToolbox],
        });

        expect(result.toolBySlug.get('read')).toBe(filesToolbox[0]);
        expect(result.toolBySlug.get('write')).toBe(filesToolbox[1]);
        expect(result.toolBySlug.get('bash_exec')).toBe(bashToolbox[0]);
      });
    });
  });

  given('[case2] empty toolboxes array', () => {
    when('[t0] merge is called', () => {
      then('returns empty tools', () => {
        const result = mergeBrainArch1Toolboxes({ toolboxes: [] });

        expect(result.tools).toHaveLength(0);
        expect(result.toolBySlug.size).toBe(0);
      });
    });
  });

  given('[case3] toolboxes with duplicate tool slugs', () => {
    const box1: BrainPlugToolDefinition<unknown, unknown, 'repl'>[] = [
      createMockTool('read', 'read from files'),
    ];
    const box2: BrainPlugToolDefinition<unknown, unknown, 'repl'>[] = [
      createMockTool('read', 'read from network'),
    ];

    when('[t0] merge is called', () => {
      then('throws bad request error', async () => {
        const error = await getError(async () =>
          mergeBrainArch1Toolboxes({ toolboxes: [box1, box2] }),
        );

        expect(error).toBeDefined();
        expect(error?.message).toContain('duplicate tool slug');
      });
    });
  });

  given('[case4] single toolbox', () => {
    const singleToolbox: BrainPlugToolDefinition<unknown, unknown, 'repl'>[] = [
      createMockTool('read', 'read file'),
    ];

    when('[t0] merge is called', () => {
      then('returns single toolbox tools', () => {
        const result = mergeBrainArch1Toolboxes({ toolboxes: [singleToolbox] });

        expect(result.tools).toHaveLength(1);
        expect(result.toolBySlug.get('read')).toBe(singleToolbox[0]);
      });
    });
  });
});
