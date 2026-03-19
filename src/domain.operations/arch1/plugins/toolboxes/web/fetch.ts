import { genBrainPlugToolDeclaration } from 'rhachet/brains';
import { z } from 'zod';

/**
 * .what = zod schema for webfetch tool input
 * .why = enables type-safe validation
 */
const schemaWebfetchInput = z.object({
  url: z.string().describe('The URL to fetch content from'),
  max_length: z
    .number()
    .optional()
    .describe('Maximum characters to return (default: 10000, max: 50000)'),
});

/**
 * .what = zod schema for webfetch tool output
 * .why = enables type-safe output validation
 */
const schemaWebfetchOutput = z.object({
  content: z.string().describe('Text content from the URL'),
});

/**
 * .what = webfetch tool declaration via rhachet's factory
 * .why = enables the brain to read content from URLs for research
 */
export const toolWebFetch = genBrainPlugToolDeclaration({
  slug: 'webfetch',
  name: 'webfetch',
  description:
    'Fetch and read content from a URL. Returns the text content of the page. Use this to read articles, documentation, or other web pages found via websearch.',
  schema: {
    input: schemaWebfetchInput,
    output: schemaWebfetchOutput,
  },
  execute: async ({ invocation }) => {
    const maxLength = Math.min(invocation.input.max_length ?? 10000, 50000);

    const response = await fetch(invocation.input.url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; BrainArch1/1.0; +https://github.com/ehmpathy)',
        Accept: 'text/html,application/xhtml+xml,text/plain',
      },
      redirect: 'follow',
    });

    if (!response.ok)
      throw new Error(
        `fetch failed: ${response.status} ${response.statusText}`,
      );

    const contentType = response.headers.get('content-type') ?? '';
    const html = await response.text();

    // extract text content from HTML
    const text = extractTextContent(html, contentType);
    const truncated =
      text.length > maxLength
        ? text.slice(0, maxLength) + '\n\n[truncated]'
        : text;

    return { content: `Content from ${invocation.input.url}:\n\n${truncated}` };
  },
});

/**
 * .what = extracts readable text from HTML content
 * .why = removes HTML tags and scripts to get clean text
 */
const extractTextContent = (html: string, contentType: string): string => {
  // if plain text, return as-is
  if (contentType.includes('text/plain')) return html;

  // remove script and style tags with their content
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');

  // replace common block elements with newlines
  text = text
    .replace(/<(p|div|br|h[1-6]|li|tr)[^>]*>/gi, '\n')
    .replace(/<\/?(ul|ol|table|tbody)[^>]*>/gi, '\n');

  // remove remaining HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // decode HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));

  // clean up whitespace
  text = text
    .replace(/\s+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text;
};
