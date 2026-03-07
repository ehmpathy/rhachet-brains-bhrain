import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { given, then, when } from 'test-fns';

import { REPEATABLY_CONFIG } from '@src/.test/infra/repeatably';
import { logOutputHead } from '@src/.test/logOutputHead';
import { BrainArch1Repl } from '@src/domain.objects/BrainArch1/BrainArch1Repl';
import { invokeBrainArch1 } from '@src/domain.operations/arch1/core/invokeBrainArch1';
import { genAtomAnthropic } from '@src/domain.operations/arch1/plugins/atoms/anthropic';
import { genAtomOpenai } from '@src/domain.operations/arch1/plugins/atoms/openai';
import { toolboxFiles } from '@src/domain.operations/arch1/plugins/toolboxes/files';
import { toolboxWeb } from '@src/domain.operations/arch1/plugins/toolboxes/web';

/**
 * .what = integration tests for invokeBrainArch1
 * .why = verify end-to-end agentic loop behavior with real LLM
 *
 * .note = requires ANTHROPIC_API_KEY or OPENAI_API_KEY env vars
 */
describe('invokeBrainArch1', () => {
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
      qwen: {
        apiKey: process.env.QWEN_API_KEY ?? '',
        url: process.env.QWEN_API_URL ?? null,
      },
      tavily: {
        apiKey: process.env.TAVILY_API_KEY ?? '',
      },
    },
    log: console,
  });

  let testDir: string;

  beforeAll(async () => {
    // create temp directory for file tests
    testDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'brain-arch1-integ-test-'),
    );
  });

  afterAll(async () => {
    // cleanup temp directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  given('[case1] anthropic provider with simple prompt', () => {
    when('[t0] invoked with greeting', () => {
      then.repeatably(REPEATABLY_CONFIG)(
        'returns natural language response',
        async () => {
          const context = getContext();

          const repl = new BrainArch1Repl({
            atom: genAtomAnthropic({ model: 'claude-sonnet-4-20250514' }),
            toolboxes: [],
            memory: null,
            permission: null,
            constraints: {
              maxIterations: 10,
              maxTokens: 4096,
            },
            role: {
              systemPrompt: 'You are a helpful assistant. Be concise.',
            },
          });

          const result = await invokeBrainArch1(
            {
              repl,
              userInput: 'Say hello in exactly 3 words.',
            },
            context,
          );

          // log output for observability
          logOutputHead({
            label: 'brainArch1.anthropic.simple',
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

  given('[case2] anthropic provider with file read tool', () => {
    when('[t0] asked to read a file that exists', () => {
      then.repeatably(REPEATABLY_CONFIG)(
        'uses tool and returns file contents',
        async () => {
          const context = getContext();

          // create test file
          const testFile = path.join(testDir, 'test-read.txt');
          await fs.writeFile(testFile, 'Hello from test file!');

          const repl = new BrainArch1Repl({
            atom: genAtomAnthropic({ model: 'claude-sonnet-4-20250514' }),
            toolboxes: [toolboxFiles],
            memory: null,
            permission: null,
            constraints: {
              maxIterations: 10,
              maxTokens: 4096,
            },
            role: {
              systemPrompt:
                'You are a helpful assistant. When asked to read files, use the read tool.',
            },
          });

          const result = await invokeBrainArch1(
            {
              repl,
              userInput: `Read the file at ${testFile} and tell me what it says.`,
            },
            context,
          );

          // log output for observability
          logOutputHead({
            label: 'brainArch1.anthropic.fileread',
            output: result.finalResponse ?? '',
          });

          expect(result.terminationReason).toBe('NATURAL_COMPLETION');
          expect(result.finalResponse).toBeTruthy();
          expect(result.finalResponse).toContain('Hello from test file');
          expect(result.iterationCount).toBeGreaterThanOrEqual(2); // tool call + response
        },
      );
    });
  });

  given('[case3] openai provider with simple prompt', () => {
    when('[t0] invoked with greeting', () => {
      then.repeatably(REPEATABLY_CONFIG)(
        'returns natural language response',
        async () => {
          const context = getContext();

          const repl = new BrainArch1Repl({
            atom: genAtomOpenai({ model: 'gpt-4o' }),
            toolboxes: [],
            memory: null,
            permission: null,
            constraints: {
              maxIterations: 10,
              maxTokens: 4096,
            },
            role: {
              systemPrompt: 'You are a helpful assistant. Be concise.',
            },
          });

          const result = await invokeBrainArch1(
            {
              repl,
              userInput: 'Say hello in exactly 3 words.',
            },
            context,
          );

          // log output for observability
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

  given('[case4] openai provider with file read tool', () => {
    when('[t0] asked to read a file that exists', () => {
      then.repeatably(REPEATABLY_CONFIG)(
        'uses tool and returns file contents',
        async () => {
          const context = getContext();

          // create test file
          const testFile = path.join(testDir, 'test-read-openai.txt');
          await fs.writeFile(testFile, 'Greetings from OpenAI test!');

          const repl = new BrainArch1Repl({
            atom: genAtomOpenai({ model: 'gpt-4o' }),
            toolboxes: [toolboxFiles],
            memory: null,
            permission: null,
            constraints: {
              maxIterations: 10,
              maxTokens: 4096,
            },
            role: {
              systemPrompt:
                'You are a helpful assistant with file system access. Use the read tool to read files when asked.',
            },
          });

          const result = await invokeBrainArch1(
            {
              repl,
              userInput: `Read the file at ${testFile} and tell me what it says.`,
            },
            context,
          );

          // log output for observability
          logOutputHead({
            label: 'brainArch1.openai.fileread',
            output: result.finalResponse ?? '',
          });

          expect(result.terminationReason).toBe('NATURAL_COMPLETION');
          expect(result.finalResponse).toBeTruthy();
          expect(result.finalResponse).toContain('Greetings from OpenAI test');
          expect(result.iterationCount).toBeGreaterThanOrEqual(2);
        },
      );
    });
  });

  given('[case5] multi-turn with tool usage', () => {
    when('[t0] writes and then reads file', () => {
      then.repeatably(REPEATABLY_CONFIG)(
        'handles multi-step workflow',
        async () => {
          const context = getContext();

          const testFile = path.join(testDir, 'test-write-read.txt');

          const repl = new BrainArch1Repl({
            atom: genAtomAnthropic({ model: 'claude-sonnet-4-20250514' }),
            toolboxes: [toolboxFiles],
            memory: null,
            permission: null,
            constraints: {
              maxIterations: 10,
              maxTokens: 4096,
            },
            role: {
              systemPrompt:
                'You are a helpful assistant. Use tools when needed. Be concise.',
            },
          });

          const result = await invokeBrainArch1(
            {
              repl,
              userInput: `Write the text "Integration test successful!" to ${testFile}, then read it back to confirm.`,
            },
            context,
          );

          // log output for observability
          logOutputHead({
            label: 'brainArch1.anthropic.multiturn',
            output: result.finalResponse ?? '',
          });

          expect(result.terminationReason).toBe('NATURAL_COMPLETION');
          expect(result.finalResponse).toBeTruthy();
          expect(result.iterationCount).toBeGreaterThanOrEqual(3); // write + read + response

          // verify file was actually written
          const content = await fs.readFile(testFile, 'utf-8');
          expect(content).toContain('Integration test successful');
        },
      );
    });
  });

  // .skip: web research test is too slow and flaky for CI (depends on external services, can exceed 5min timeout)
  given.skip('[case6] anthropic provider with web research task', () => {
    // extend timeout for web research (5 minutes)
    jest.setTimeout(300000);

    when('[t0] asked to research sea turtles', () => {
      then.repeatably(REPEATABLY_CONFIG)(
        'produces report with cited source',
        async () => {
          const context = getContext();

          // create timestamped output directory
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const outputDir = path.join(
            process.cwd(),
            '.test',
            '.temp',
            `research.v${timestamp}`,
          );
          await fs.mkdir(outputDir, { recursive: true });

          const repl = new BrainArch1Repl({
            atom: genAtomAnthropic({ model: 'claude-sonnet-4-20250514' }),
            toolboxes: [toolboxWeb, toolboxFiles],
            memory: null,
            permission: null,
            constraints: {
              maxIterations: 100,
              maxTokens: 4096,
            },
            role: {
              systemPrompt: `You are a research assistant. Your task is to research topics thoroughly using web search and produce well-cited reports.

When researching:
1. Use websearch to find relevant sources
2. Use webfetch to read the content of promising URLs
3. Gather information from multiple sources
4. Write a comprehensive report with inline citations
5. Include a sources section at the end with all URLs used

Always cite your sources using [Source N] format in the text, and list all sources at the end.`,
            },
          });

          const reportPath = path.join(outputDir, 'sea-turtles-report.md');

          const result = await invokeBrainArch1(
            {
              repl,
              userInput: `Research sea turtles and write a brief report. Your report must:
1. Cover key facts about sea turtles (species, habitat, conservation status)
2. Cite at least 1 source using [Source 1] format
3. End with a "Sources" section listing the URL

Write the final report to: ${reportPath}`,
            },
            context,
          );

          // log output for observability
          logOutputHead({
            label: 'brainArch1.anthropic.webresearch',
            output: result.finalResponse ?? '',
          });

          expect(result.terminationReason).toBe('NATURAL_COMPLETION');
          expect(result.finalResponse).toBeTruthy();
          expect(result.iterationCount).toBeGreaterThanOrEqual(3);

          // verify report was written
          const reportExists = await fs
            .access(reportPath)
            .then(() => true)
            .catch(() => false);
          expect(reportExists).toBe(true);

          // verify report has citations
          const reportContent = await fs.readFile(reportPath, 'utf-8');
          console.log('Report written to:', reportPath);
          console.log('Report length:', reportContent.length, 'characters');

          // check for source citations
          const sourceMatches = reportContent.match(/\[Source \d+\]/g) ?? [];
          const uniqueSources = new Set(sourceMatches);
          console.log('Unique sources cited:', uniqueSources.size);

          expect(uniqueSources.size).toBeGreaterThanOrEqual(1);

          // check for sources section
          expect(reportContent.toLowerCase()).toContain('source');
          expect(reportContent).toMatch(/https?:\/\//);
        },
      );
    });
  });
});
