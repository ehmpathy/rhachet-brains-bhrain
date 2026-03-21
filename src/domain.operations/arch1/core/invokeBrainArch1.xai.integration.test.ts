import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { genBrainAtom as genAtomXai } from 'rhachet-brains-xai';
import { given, then, when } from 'test-fns';

import { REPEATABLY_CONFIG } from '@src/.test/infra/repeatably';
import { withTimeout } from '@src/.test/infra/withTimeout';
import { logOutputHead } from '@src/.test/logOutputHead';
import {
  type BrainArch1Config,
  invokeBrainArch1,
} from '@src/domain.operations/arch1/core/invokeBrainArch1';
import { toolboxFiles } from '@src/domain.operations/arch1/plugins/toolboxes/files';

/**
 * .what = xai integration tests for invokeBrainArch1
 * .why = verify bhrain works with xai BrainAtom (grok/code-fast-1)
 *
 * .note = requires XAI_API_KEY env var
 * .strategy = core behavior tests (15x cheaper than anthropic)
 *   - simple prompt
 *   - file tool
 *   - multi-turn tool usage
 *
 * .see = invokeBrainArch1.xai.websearch.integration.test.ts for web research
 * .see = invokeBrainArch1.xai.codewrite.integration.test.ts for code generation
 */
describe('invokeBrainArch1.xai', () => {
  // xai api is slower than anthropic/openai — allow extra time for all tests
  jest.setTimeout(180_000);

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
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'brain-arch1-xai-test-'));
  });

  afterAll(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  given('[case1] xai with simple prompt', () => {
    when('[t0] invoked with hello', () => {
      then.repeatably(REPEATABLY_CONFIG)(
        'returns natural language response',
        async () => {
          const context = getContext();

          const config: BrainArch1Config = {
            atom: genAtomXai({ slug: 'xai/grok/code-fast-1' }),
            toolboxes: [],
            systemPrompt: 'You are a helpful assistant. Respond concisely.',
            maxIterations: 100,
            maxTokens: 4096,
            permissionGuard: null,
          };

          const result = await invokeBrainArch1(
            {
              config,
              userInput: 'Say hello',
            },
            context,
          );

          logOutputHead({
            label: 'brainArch1.xai.simple',
            output: result.finalResponse ?? '',
          });

          expect(result.terminationReason).toBe('NATURAL_COMPLETION');
          expect(result.finalResponse).toBeTruthy();
          expect(result.iterationCount).toBe(1);
        },
      );
    });
  });

  given('[case2] xai with file read tool', () => {
    when('[t0] asked to read a file that exists', () => {
      then.repeatably(REPEATABLY_CONFIG)(
        'uses tool and returns file contents',
        async () => {
          const context = getContext();

          const testFilePath = path.join(testDir, 'test-read-xai.txt');
          await fs.writeFile(testFilePath, 'Hello from xai test file!');

          const config: BrainArch1Config = {
            atom: genAtomXai({ slug: 'xai/grok/code-fast-1' }),
            toolboxes: [toolboxFiles],
            systemPrompt:
              'You are a helpful assistant with file system access. Use tools when needed.',
            maxIterations: 100,
            maxTokens: 4096,
            permissionGuard: null,
          };

          const result = await invokeBrainArch1(
            {
              config,
              userInput: `Read the file at ${testFilePath} and tell me what it contains.`,
            },
            context,
          );

          logOutputHead({
            label: 'brainArch1.xai.fileread',
            output: result.finalResponse ?? '',
          });

          expect(result.terminationReason).toBe('NATURAL_COMPLETION');
          expect(result.finalResponse).toBeTruthy();
          expect(result.finalResponse?.toLowerCase()).toContain('hello');
          expect(result.iterationCount).toBeGreaterThanOrEqual(2);
        },
      );
    });
  });

  given('[case3] xai with multi-turn tool usage', () => {
    when('[t0] writes and then reads file', () => {
      then.repeatably(REPEATABLY_CONFIG)(
        'handles multi-step workflow',
        withTimeout(150_000, async () => {
          const context = getContext();

          const testFile = path.join(testDir, 'test-write-read-xai.txt');

          const config: BrainArch1Config = {
            atom: genAtomXai({ slug: 'xai/grok/code-fast-1' }),
            toolboxes: [toolboxFiles],
            systemPrompt:
              'You are a helpful assistant. Use tools when needed. Be concise.',
            maxIterations: 100,
            maxTokens: 4096,
            permissionGuard: null,
          };

          const result = await invokeBrainArch1(
            {
              config,
              userInput: `Write the text "Integration test successful!" to ${testFile}, then read it back to confirm.`,
            },
            context,
          );

          logOutputHead({
            label: 'brainArch1.xai.multiturn',
            output: result.finalResponse ?? '',
          });

          expect(result.terminationReason).toBe('NATURAL_COMPLETION');
          expect(result.finalResponse).toBeTruthy();
          expect(result.iterationCount).toBeGreaterThanOrEqual(3);

          const content = await fs.readFile(testFile, 'utf-8');
          expect(content).toContain('Integration test successful');
        }),
      );
    });
  });
});
