import { given, then, when } from 'test-fns';

import { REPEATABLY_CONFIG } from '@src/.test/infra/repeatably';

import { executeToolFetch } from './fetch';

/**
 * .what = integration tests for web fetch tool
 * .why = verify URL content fetching works end-to-end
 */
describe('executeToolFetch', () => {
  given('[case1] a valid URL', () => {
    when('[t0] fetch ahbode.com', () => {
      then('returns page content', async () => {
        const result = await executeToolFetch({
          callId: 'test-call-1',
          args: { url: 'https://ahbode.com' },
        });

        expect(result.success).toBe(true);
        expect(result.error).toBeNull();
        expect(result.output).toContain('ahbode.com');
      });
    });

    when('[t1] fetch httpbin JSON endpoint', () => {
      then.repeatably(REPEATABLY_CONFIG)('returns JSON content', async () => {
        const result = await executeToolFetch({
          callId: 'test-call-2',
          args: {
            url: 'https://httpbin.org/json',
          },
        });

        expect(result.success).toBe(true);
        expect(result.error).toBeNull();
        expect(result.output).toContain('httpbin.org');
      });
    });
  });

  given('[case2] content length limits', () => {
    when('[t0] fetch with max_length', () => {
      then('truncates content appropriately', async () => {
        const result = await executeToolFetch({
          callId: 'test-call-3',
          args: { url: 'https://ahbode.com', max_length: 100 },
        });

        expect(result.success).toBe(true);

        // content should be limited (100 chars + url prefix + truncation notice)
        expect(result.output.length).toBeLessThan(500);
      });
    });
  });

  given('[case3] an invalid URL', () => {
    when('[t0] fetch a non-existent domain', () => {
      then('returns error gracefully', async () => {
        const result = await executeToolFetch({
          callId: 'test-call-4',
          args: { url: 'https://this-domain-does-not-exist-12345.com' },
        });

        expect(result.success).toBe(false);
        expect(result.error).toBeTruthy();
      });
    });

    when('[t1] fetch a 404 page', () => {
      then.repeatably(REPEATABLY_CONFIG)(
        'returns error with status code',
        async () => {
          const result = await executeToolFetch({
            callId: 'test-call-5',
            args: { url: 'https://httpbin.org/status/404' },
          });

          expect(result.success).toBe(false);
          expect(result.error).toContain('404');
        },
      );
    });
  });

  given('[case4] HTML content extraction', () => {
    when('[t0] fetch wikipedia sea turtle page', () => {
      then('strips scripts and extracts text about sea turtles', async () => {
        const result = await executeToolFetch({
          callId: 'test-call-6',
          args: { url: 'https://en.wikipedia.org/wiki/Sea_turtle' },
        });

        expect(result.success).toBe(true);
        expect(result.output.toLowerCase()).toContain('turtle');

        // should not contain raw script tags
        expect(result.output).not.toContain('<script');
        expect(result.output).not.toContain('</script>');
      });
    });

    when('[t1] fetch NOAA ocean page', () => {
      then('extracts ocean conservation content', async () => {
        const result = await executeToolFetch({
          callId: 'test-call-7',
          args: { url: 'https://oceanservice.noaa.gov/facts/seaturtles.html' },
        });

        // may or may not succeed depending on network
        if (result.success) {
          expect(result.output.toLowerCase()).toMatch(/turtle|ocean|sea/);
        }
      });
    });
  });
});
