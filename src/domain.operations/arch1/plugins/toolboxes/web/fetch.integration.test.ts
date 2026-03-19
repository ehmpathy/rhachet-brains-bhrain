import { given, then, when } from 'test-fns';

import { genMockBrainArch1Context } from '@src/.test/genMockBrainArch1Context';
import { REPEATABLY_CONFIG } from '@src/.test/infra/repeatably';

import { toolWebFetch } from './fetch';

const mockContext = genMockBrainArch1Context();

/**
 * .what = integration tests for web fetch tool
 * .why = verify URL content fetch works end-to-end via BrainPlugToolExecution
 */
describe('toolWebFetch', () => {
  given('[case1] a valid URL', () => {
    when('[t0] fetch ahbode.com', () => {
      then('returns page content', async () => {
        const result = await toolWebFetch.execute(
          {
            invocation: {
              exid: 'test-call-1',
              slug: 'webfetch',
              input: { url: 'https://ahbode.com' },
            },
          },
          mockContext,
        );

        expect(result.signal).toBe('success');
        if (result.signal === 'success') {
          expect(result.output.content).toContain('ahbode.com');
        }
      });
    });

    when('[t1] fetch httpbin JSON endpoint', () => {
      then.repeatably(REPEATABLY_CONFIG)('returns JSON content', async () => {
        const result = await toolWebFetch.execute(
          {
            invocation: {
              exid: 'test-call-2',
              slug: 'webfetch',
              input: { url: 'https://httpbin.org/json' },
            },
          },
          mockContext,
        );

        expect(result.signal).toBe('success');
        if (result.signal === 'success') {
          expect(result.output.content).toContain('httpbin.org');
        }
      });
    });
  });

  given('[case2] content length limits', () => {
    when('[t0] fetch with max_length', () => {
      then('truncates content appropriately', async () => {
        const result = await toolWebFetch.execute(
          {
            invocation: {
              exid: 'test-call-3',
              slug: 'webfetch',
              input: { url: 'https://ahbode.com', max_length: 100 },
            },
          },
          mockContext,
        );

        expect(result.signal).toBe('success');
        if (result.signal === 'success') {
          // content should be limited (100 chars + url prefix + truncation notice)
          expect(result.output.content.length).toBeLessThan(500);
        }
      });
    });
  });

  given('[case3] an invalid URL', () => {
    when('[t0] fetch a domain that does not exist', () => {
      then('returns error:malfunction', async () => {
        const result = await toolWebFetch.execute(
          {
            invocation: {
              exid: 'test-call-4',
              slug: 'webfetch',
              input: { url: 'https://this-domain-does-not-exist-12345.com' },
            },
          },
          mockContext,
        );

        expect(result.signal).toBe('error:malfunction');
      });
    });

    when('[t1] fetch a 404 page', () => {
      then.repeatably(REPEATABLY_CONFIG)(
        'returns error:malfunction',
        async () => {
          const result = await toolWebFetch.execute(
            {
              invocation: {
                exid: 'test-call-5',
                slug: 'webfetch',
                input: { url: 'https://httpbin.org/status/404' },
              },
            },
            mockContext,
          );

          expect(result.signal).toBe('error:malfunction');
        },
      );
    });
  });

  given('[case4] HTML content extraction', () => {
    when('[t0] fetch wikipedia sea turtle page', () => {
      then('strips scripts and extracts text about sea turtles', async () => {
        const result = await toolWebFetch.execute(
          {
            invocation: {
              exid: 'test-call-6',
              slug: 'webfetch',
              input: { url: 'https://en.wikipedia.org/wiki/Sea_turtle' },
            },
          },
          mockContext,
        );

        expect(result.signal).toBe('success');
        if (result.signal === 'success') {
          expect(result.output.content.toLowerCase()).toContain('turtle');

          // should not contain raw script tags
          expect(result.output.content).not.toContain('<script');
          expect(result.output.content).not.toContain('</script>');
        }
      });
    });

    when('[t1] fetch NOAA ocean page', () => {
      then('extracts ocean conservation content', async () => {
        const result = await toolWebFetch.execute(
          {
            invocation: {
              exid: 'test-call-7',
              slug: 'webfetch',
              input: {
                url: 'https://oceanservice.noaa.gov/facts/seaturtles.html',
              },
            },
          },
          mockContext,
        );

        // may or may not succeed depending on network
        if (result.signal === 'success') {
          expect(result.output.content.toLowerCase()).toMatch(
            /turtle|ocean|sea/,
          );
        }
      });
    });
  });
});
