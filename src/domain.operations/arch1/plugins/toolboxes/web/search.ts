import { z } from 'zod';

import type { BrainArch1Context } from '@src/domain.objects/BrainArch1/BrainArch1Context';
import {
  BrainArch1ToolDefinition,
  toJsonSchema,
} from '@src/domain.objects/BrainArch1/BrainArch1ToolDefinition';
import { BrainArch1ToolResult } from '@src/domain.objects/BrainArch1/BrainArch1ToolResult';

/**
 * .what = zod schema for websearch tool input
 * .why = enables type-safe validation and json schema generation
 */
export const schemaWebsearchInput = z.object({
  query: z.string().describe('The search query to look up'),
  num_results: z
    .number()
    .optional()
    .describe('Number of results to return (default: 10, max: 20)'),
});

/**
 * .what = tool definition for web search
 * .why = enables the brain to search the web for information
 */
export const toolDefinitionSearch = new BrainArch1ToolDefinition({
  name: 'websearch',
  description:
    'Search the web for information. Returns search results with titles, URLs, and snippets. Use this to find current information, research topics, and gather sources for citations.',
  schema: {
    input: toJsonSchema(schemaWebsearchInput),
  },
  strict: false,
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
 * .why = typed response for parsing
 */
interface TavilySearchResponse {
  query: string;
  results: TavilySearchResult[];
}

/**
 * .what = executes web search using Tavily API
 * .why = provides reliable web search with proper API authentication
 *
 * .note = requires TAVILY_API_KEY in context.creds.tavily
 */
export const executeToolSearch = async (
  input: {
    callId: string;
    args: { query: string; num_results?: number };
  },
  context: BrainArch1Context,
): Promise<BrainArch1ToolResult> => {
  const { callId, args } = input;
  const numResults = Math.min(args.num_results ?? 10, 20);

  // check for api key
  if (!context.creds.tavily.apiKey) {
    return new BrainArch1ToolResult({
      callId,
      success: false,
      output: '',
      error: 'TAVILY_API_KEY not configured',
    });
  }

  try {
    // call Tavily search API
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: context.creds.tavily.apiKey,
        query: args.query,
        max_results: numResults,
        search_depth: 'basic',
        include_answer: false,
        include_raw_content: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new BrainArch1ToolResult({
        callId,
        success: false,
        output: '',
        error: `tavily search failed: ${response.status} ${response.statusText} - ${errorText}`,
      });
    }

    const data = (await response.json()) as TavilySearchResponse;

    if (!data.results || data.results.length === 0) {
      return new BrainArch1ToolResult({
        callId,
        success: true,
        output: `No results found for query: "${args.query}"`,
        error: null,
      });
    }

    // format results for the brain
    const formattedResults = data.results
      .map(
        (r, i) => `[${i + 1}] ${r.title}\n    URL: ${r.url}\n    ${r.content}`,
      )
      .join('\n\n');

    return new BrainArch1ToolResult({
      callId,
      success: true,
      output: `Found ${data.results.length} results for "${args.query}":\n\n${formattedResults}`,
      error: null,
    });
  } catch (error) {
    return new BrainArch1ToolResult({
      callId,
      success: false,
      output: '',
      error: `search failed: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
};
