import { given, then, when } from 'test-fns';

import { genContextLogTrail } from '@src/.test/genContextLogTrail';
import { REPEATABLY_CONFIG } from '@src/.test/infra/repeatably';
import type { BrainArch1Context } from '@src/domain.objects/BrainArch1/BrainArch1Context';

import { executeToolSearch } from './search';

/**
 * .what = skip test if Tavily quota exceeded
 * .why = quota errors are not test failures, just plan limits
 */
const skipIfQuotaExceeded = (result: { error: string | null }): boolean => {
  if (result.error?.includes('exceeds your plan')) {
    console.log('⚠️ skipped: Tavily quota exceeded');
    return true;
  }
  return false;
};

/**
 * .what = mock context for test
 * .why = provides context with tavily api key for search tests
 */
const getMockContext = (): BrainArch1Context => ({
  creds: {
    anthropic: { apiKey: '', url: null },
    openai: { apiKey: '', url: null },
    qwen: { apiKey: '', url: null },
    tavily: { apiKey: process.env.TAVILY_API_KEY ?? '' },
  },
  ...genContextLogTrail(),
});

/**
 * .what = integration tests for web search tool
 * .why = verify Tavily search works end-to-end
 *
 * .note = requires TAVILY_API_KEY environment variable
 */
(process.env.TAVILY_API_KEY ? describe : describe.skip)('executeToolSearch', () => {
  given('[case1] a simple search query', () => {
    when('[t0] searching for "sea turtles conservation"', () => {
      // note: use repeatably to handle flaky external API cold starts
      then.repeatably(REPEATABLY_CONFIG)(
        'returns search results with titles, urls, and snippets',
        async () => {
          const result = await executeToolSearch(
            {
              callId: 'test-call-1',
              args: { query: 'sea turtles conservation', num_results: 5 },
            },
            getMockContext(),
          );

          // skip if quota exceeded
          if (skipIfQuotaExceeded(result)) return;

          // log error for observability on failure
          if (!result.success) {
            console.log('⛈️ search failed:', {
              error: result.error,
              output: result.output,
            });
          }

          expect(result.success).toBe(true);
          expect(result.error).toBeNull();
          expect(result.output).toContain('Found');

          // verify result format
          expect(result.output).toMatch(/\[1\]/); // has numbered results
          expect(result.output).toMatch(/URL:/); // has URLs
          expect(result.output).toMatch(/https?:\/\//); // has actual URLs
        },
      );
    });

    when('[t1] searching for "coral reef ecosystem"', () => {
      then('returns relevant ocean ecology results', async () => {
        const result = await executeToolSearch(
          {
            callId: 'test-call-2',
            args: { query: 'coral reef ecosystem', num_results: 3 },
          },
          getMockContext(),
        );

        if (skipIfQuotaExceeded(result)) return;

        expect(result.success).toBe(true);
        expect(result.output).toContain('Found');
      });
    });

    when('[t2] searching for "typescript generics tutorial"', () => {
      then('returns relevant programming results', async () => {
        const result = await executeToolSearch(
          {
            callId: 'test-call-2b',
            args: { query: 'typescript generics tutorial', num_results: 3 },
          },
          getMockContext(),
        );

        if (skipIfQuotaExceeded(result)) return;

        expect(result.success).toBe(true);
        expect(result.output).toContain('Found');
      });
    });
  });

  given('[case2] limiting results', () => {
    when(
      '[t0] requesting only 2 results for "leatherback turtle migration"',
      () => {
        then('returns at most 2 results', async () => {
          const result = await executeToolSearch(
            {
              callId: 'test-call-3',
              args: { query: 'leatherback turtle migration', num_results: 2 },
            },
            getMockContext(),
          );

          if (skipIfQuotaExceeded(result)) return;

          expect(result.success).toBe(true);

          // count result blocks (each starts with [N])
          const resultCount = (result.output.match(/\[\d+\]/g) ?? []).length;
          expect(resultCount).toBeLessThanOrEqual(2);
        });
      },
    );
  });

  given('[case3] an obscure query with no results', () => {
    when('[t0] searching for gibberish', () => {
      then('returns no results message gracefully', async () => {
        const result = await executeToolSearch(
          {
            callId: 'test-call-4',
            args: { query: 'xyzzy12345qwertynonsense99999', num_results: 5 },
          },
          getMockContext(),
        );

        if (skipIfQuotaExceeded(result)) return;

        expect(result.success).toBe(true);
        expect(result.error).toBeNull();
        // either returns "No results" or very few results
      });
    });
  });
});
