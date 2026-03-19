import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { genBrainAtom as genAtomOpenai } from 'rhachet-brains-openai';
import { given, then, when } from 'test-fns';

import { REPEATABLY_CONFIG } from '@src/.test/infra/repeatably';
import { logOutputHead } from '@src/.test/logOutputHead';
import {
  type BrainArch1Config,
  invokeBrainArch1,
} from '@src/domain.operations/arch1/core/invokeBrainArch1';
import { toolboxFiles } from '@src/domain.operations/arch1/plugins/toolboxes/files';

/**
 * .what = openai integration tests for invokeBrainArch1
 * .why = verify bhrain works with openai BrainAtom (gpt-4o)
 *
 * .note = requires OPENAI_API_KEY env var
 * .strategy = minimal verification (simple + file tool skipped due to upstream defect)
 */
describe('invokeBrainArch1.openai', () => {
  const getContext = () => ({
    creds: {
      anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY ?? '',
        url: null,
      },
      openai: {
        apiKey: process.env.OPENAI_API_KEY ?? '',
        url: null,
      },
      tavily: {
        apiKey: process.env.TAVILY_API_KEY ?? '',
      },
    },
    log: console,
  });

  let testDir: string;

  beforeAll(async () => {
    testDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'brain-arch1-openai-test-'),
    );
  });

  afterAll(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  given('[case1] openai with simple prompt', () => {
    when('[t0] invoked with hello', () => {
      then.repeatably(REPEATABLY_CONFIG)(
        'returns natural language response',
        async () => {
          const context = getContext();

          const config: BrainArch1Config = {
            atom: genAtomOpenai({ slug: 'openai/gpt/4o' }),
            toolboxes: [],
            systemPrompt: 'You are a helpful assistant. Be concise.',
            maxIterations: 10,
            maxTokens: 4096,
            permissionGuard: null,
          };

          const result = await invokeBrainArch1(
            {
              config,
              userInput: 'Say hello in exactly 3 words.',
            },
            context,
          );

          logOutputHead({
            label: 'brainArch1.openai.simple',
            output: result.finalResponse ?? '',
          });

          expect(result.terminationReason).toBe('NATURAL_COMPLETION');
          expect(result.finalResponse).toBeTruthy();
          expect(result.iterationCount).toBe(1);
          expect(result.totalTokenUsage.totalTokens).toBeGreaterThan(0);
        },
      );
    });
  });

  /**
   * .skip = blocked on rhachet-brains-openai#schema-optional-props
   * .why = openai strict mode requires all properties in required array
   *        rhachet-brains-openai doesn't handle optional zod props correctly
   * .see = .behavior/v2026_03_09.fix-brain-atom-noplugin/3.3.blueprint.v1.handoff.openai-schema.md
   */
  given.skip('[case2] openai with file read tool', () => {
    when('[t0] asked to read a file that exists', () => {
      then.repeatably(REPEATABLY_CONFIG)(
        'uses tool and returns file contents',
        async () => {
          const context = getContext();

          const testFile = path.join(testDir, 'test-read-openai.txt');
          await fs.writeFile(testFile, 'Hello from openai test file!');

          const config: BrainArch1Config = {
            atom: genAtomOpenai({ slug: 'openai/gpt/4o' }),
            toolboxes: [toolboxFiles],
            systemPrompt:
              'You are a helpful assistant with file system access. Use the read tool to read files when asked.',
            maxIterations: 10,
            maxTokens: 4096,
            permissionGuard: null,
          };

          const result = await invokeBrainArch1(
            {
              config,
              userInput: `Read the file at ${testFile} and tell me what it says.`,
            },
            context,
          );

          logOutputHead({
            label: 'brainArch1.openai.fileread',
            output: result.finalResponse ?? '',
          });

          expect(result.terminationReason).toBe('NATURAL_COMPLETION');
          expect(result.finalResponse).toBeTruthy();
          expect(result.finalResponse).toContain('Hello from openai test file');
          expect(result.iterationCount).toBeGreaterThanOrEqual(2);
        },
      );
    });
  });
});
