import { BadRequestError } from 'helpful-errors';
import { genBrainPlugToolDeclaration } from 'rhachet/brains';
import { z } from 'zod';

import type { BrainArch1Context } from '@src/domain.objects/BrainArch1/BrainArch1Context';

/**
 * .what = zod schema for websearch tool input
 * .why = enables type-safe validation
 */
const schemaWebsearchInput = z.object({
  query: z.string().describe('The search query to look up'),
  num_results: z
    .number()
    .optional()
    .describe('Number of results to return (default: 10, max: 20)'),
});

/**
 * .what = zod schema for websearch tool output
 * .why = enables type-safe output validation
 */
const schemaWebsearchOutput = z.object({
  results: z
    .string()
    .describe('Search results with titles, URLs, and snippets'),
});

/**
 * .what = search result from Tavily API
 * .why = structured result for citations
 */
interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

/**
 * .what = Tavily API response shape
 * .why = typed response for parse
 */
interface TavilySearchResponse {
  query: string;
  results: TavilySearchResult[];
}

/**
 * .what = websearch tool declaration via rhachet's factory
 * .why = enables the brain to search the web for information
 *
 * .note = requires TAVILY_API_KEY in context.creds.tavily
 */
export const toolWebSearch = genBrainPlugToolDeclaration({
  slug: 'websearch',
  name: 'websearch',
  description:
    'Search the web for information. Returns search results with titles, URLs, and snippets. Use this to find current information, research topics, and gather sources for citations.',
  schema: {
    input: schemaWebsearchInput,
    output: schemaWebsearchOutput,
  },
  execute: async ({ invocation }, context: unknown) => {
    const numResults = Math.min(invocation.input.num_results ?? 10, 20);

    // cast context and check for api key
    const ctx = context as BrainArch1Context;
    if (!ctx?.creds?.tavily?.apiKey)
      throw new BadRequestError('TAVILY_API_KEY not configured');

    // call Tavily search API
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: ctx.creds.tavily.apiKey,
        query: invocation.input.query,
        max_results: numResults,
        search_depth: 'basic',
        include_answer: false,
        include_raw_content: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `tavily search failed: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    const data = (await response.json()) as TavilySearchResponse;

    if (!data.results || data.results.length === 0)
      return {
        results: `No results found for query: "${invocation.input.query}"`,
      };

    // format results for the brain
    const formattedResults = data.results
      .map(
        (r, i) => `[${i + 1}] ${r.title}\n    URL: ${r.url}\n    ${r.content}`,
      )
      .join('\n\n');

    return {
      results: `Found ${data.results.length} results for "${invocation.input.query}":\n\n${formattedResults}`,
    };
  },
});
