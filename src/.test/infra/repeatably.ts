/**
 * .what = shared config for then.repeatably in flaky tests
 *
 * .why = different criteria for CI vs local development:
 *   - CI: criteria='SOME' — as long as 1 of 3 attempts passes, the test passes
 *     - prioritizes reliability over strictness
 *     - external APIs (tavily, llms) have transient failures
 *     - avoids PRs stuck on flaky infrastructure
 *
 *   - local: criteria='EVERY' — all 3 attempts must pass
 *     - prioritizes thoroughness over speed
 *     - catches intermittent bugs before they reach CI
 *     - ensures code is robust, not just lucky
 */
export const REPEATABLY_CONFIG = {
  attempts: 3,
  criteria: process.env.CI ? 'SOME' : 'EVERY',
} as const;
