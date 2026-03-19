import * as fs from 'fs/promises';
import * as path from 'path';
import { genBrainAtom as genAtomXai } from 'rhachet-brains-xai';
import { given, then, when } from 'test-fns';

import { REPEATABLY_CONFIG } from '@src/.test/infra/repeatably';
import { logOutputHead } from '@src/.test/logOutputHead';
import {
  type BrainArch1Config,
  invokeBrainArch1,
} from '@src/domain.operations/arch1/core/invokeBrainArch1';
import { toolboxFiles } from '@src/domain.operations/arch1/plugins/toolboxes/files';
import { toolboxWeb } from '@src/domain.operations/arch1/plugins/toolboxes/web';

/**
 * .what = xai websearch integration tests for invokeBrainArch1
 * .why = verify brain can research topics and produce cited reports
 *
 * .note = requires XAI_API_KEY and TAVILY_API_KEY env vars
 * .note = depends on external services (websearch, webfetch)
 */
describe('invokeBrainArch1.xai.websearch', () => {
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

  /**
   * .what = xai web research with file output
   * .note = xai/grok model would return `{ content: null }` when it writes to a file
   *         - fixed via prompt instruction: "provide verbal confirmation after file writes"
   *         - test enforces both: file written AND verbal response returned
   * .see = 3.3.blueprint.v1.handoff.xai-structured-output.md for root cause analysis
   */
  given('[case1] xai with web research task', () => {
    // extend timeout for web research (5 minutes)
    jest.setTimeout(300000);

    when('[t0] asked to research sea turtles', () => {
      then.repeatably(REPEATABLY_CONFIG)(
        'produces report with cited source',
        async () => {
          const context = getContext();

          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const outputDir = path.join(
            process.cwd(),
            '.test',
            '.temp',
            `research.v${timestamp}`,
          );
          await fs.mkdir(outputDir, { recursive: true });

          const config: BrainArch1Config = {
            atom: genAtomXai({ slug: 'xai/grok/code-fast-1' }),
            toolboxes: [toolboxWeb, toolboxFiles],
            systemPrompt: `You are a research assistant. Your task is to research topics thoroughly using web search and produce well-cited reports.

When researching:
1. Use websearch to find relevant sources
2. Use webfetch to read the content of promising URLs
3. Gather information from multiple sources
4. Write a comprehensive report with inline citations
5. Include a sources section at the end with all URLs used

Always cite your sources using [Source N] format in the text, and list all sources at the end.

IMPORTANT: After you write to a file, you must also provide a verbal confirmation in your response. File writes alone are not sufficient - always respond with a summary of what you did.`,
            maxIterations: 100,
            maxTokens: 4096,
            permissionGuard: null,
          };

          const reportPath = path.join(outputDir, 'sea-turtles-report.md');

          const result = await invokeBrainArch1(
            {
              config,
              userInput: `Research sea turtles and write a brief report. Your report must:
1. Cover key facts about sea turtles (species, habitat, conservation status)
2. Cite at least 1 source using [Source 1] format
3. End with a "Sources" section listing the URL

Write the final report to: ${reportPath}`,
            },
            context,
          );

          logOutputHead({
            label: 'brainArch1.xai.webresearch',
            output: result.finalResponse ?? '',
          });

          expect(result.terminationReason).toBe('NATURAL_COMPLETION');
          expect(result.iterationCount).toBeGreaterThanOrEqual(3);

          // require verbal confirmation in response
          expect(result.finalResponse).toBeTruthy();

          // check file was written
          const reportExists = await fs
            .access(reportPath)
            .then(() => true)
            .catch(() => false);
          expect(reportExists).toBe(true);

          const reportContent = await fs.readFile(reportPath, 'utf-8');
          console.log('Report written to:', reportPath);
          console.log('Report length:', reportContent.length, 'characters');

          const sourceMatches = reportContent.match(/\[Source \d+\]/g) ?? [];
          const uniqueSources = new Set(sourceMatches);
          console.log('Unique sources cited:', uniqueSources.size);

          expect(uniqueSources.size).toBeGreaterThanOrEqual(1);
          expect(reportContent.toLowerCase()).toContain('source');
          expect(reportContent).toMatch(/https?:\/\//);
        },
      );
    });
  });
});
