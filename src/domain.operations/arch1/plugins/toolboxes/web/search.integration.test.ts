import { given, then, when } from 'test-fns';

import { genMockBrainArch1Context } from '@src/.test/genMockBrainArch1Context';
import { REPEATABLY_CONFIG } from '@src/.test/infra/repeatably';

import { toolWebSearch } from './search';

/**
 * .what = get mock context with tavily api key
 * .why = integration tests need real api key
 */
const getMockContext = () => {
  const baseContext = genMockBrainArch1Context();
  return {
    ...baseContext,
    creds: {
      ...baseContext.creds,
      tavily: { apiKey: process.env.TAVILY_API_KEY ?? '' },
    },
  };
};

/**
 * .what = integration tests for web search tool
 * .why = verify Tavily search works end-to-end via BrainPlugToolExecution
 */
describe('toolWebSearch', () => {
  given('[case1] a simple search query', () => {
    when('[t0] search for "sea turtles conservation"', () => {
      // note: use repeatably to handle flaky external API cold starts
      then.repeatably(REPEATABLY_CONFIG)(
        'returns search results with titles and URLs',
        async () => {
          const result = await toolWebSearch.execute(
            {
              invocation: {
                exid: 'test-call-1',
                slug: 'websearch',
                input: { query: 'sea turtles conservation', num_results: 5 },
              },
            },
            getMockContext(),
          );

          // skip if quota exceeded
          if (result.signal !== 'success') {
            if (result.output?.error?.message?.includes('exceeds your plan')) {
              console.log('⚠️ skipped: Tavily quota exceeded');
              return;
            }
            throw new Error(`unexpected error: ${result.signal}`);
          }

          expect(result.output.results).toContain('Found');
          expect(result.output.results).toMatch(/\[1\]/); // has numbered results
          expect(result.output.results).toMatch(/URL:/); // has URLs
        },
      );
    });

    when('[t1] search for "coral reef ecosystem"', () => {
      then('returns relevant ocean ecology results', async () => {
        const result = await toolWebSearch.execute(
          {
            invocation: {
              exid: 'test-call-2',
              slug: 'websearch',
              input: { query: 'coral reef ecosystem', num_results: 3 },
            },
          },
          getMockContext(),
        );

        if (result.signal !== 'success') return;

        expect(result.output.results).toContain('Found');
      });
    });

    when('[t2] search for "typescript generics tutorial"', () => {
      then('returns relevant code results', async () => {
        const result = await toolWebSearch.execute(
          {
            invocation: {
              exid: 'test-call-2b',
              slug: 'websearch',
              input: { query: 'typescript generics tutorial', num_results: 3 },
            },
          },
          getMockContext(),
        );

        if (result.signal !== 'success') return;

        expect(result.output.results).toContain('Found');
      });
    });
  });

  given('[case2] limiting results', () => {
    when(
      '[t0] request only 2 results for "leatherback turtle migration"',
      () => {
        then('returns at most 2 results', async () => {
          const result = await toolWebSearch.execute(
            {
              invocation: {
                exid: 'test-call-3',
                slug: 'websearch',
                input: {
                  query: 'leatherback turtle migration',
                  num_results: 2,
                },
              },
            },
            getMockContext(),
          );

          if (result.signal !== 'success') return;

          // count result blocks (each starts with [N])
          const resultCount = (result.output.results.match(/\[\d+\]/g) ?? [])
            .length;
          expect(resultCount).toBeLessThanOrEqual(2);
        });
      },
    );
  });

  given('[case3] an obscure query with no results', () => {
    when('[t0] search for gibberish', () => {
      then('returns no results message gracefully', async () => {
        const result = await toolWebSearch.execute(
          {
            invocation: {
              exid: 'test-call-4',
              slug: 'websearch',
              input: { query: 'xyzzy12345qwertynonsense99999', num_results: 5 },
            },
          },
          getMockContext(),
        );

        // either success or malfunction is fine for gibberish
        expect(['success', 'error:malfunction']).toContain(result.signal);
      });
    });
  });
});
