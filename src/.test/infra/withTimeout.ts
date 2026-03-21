/**
 * .what = wraps async fn with timeout that throws before jest's timeout
 *
 * .why = jest's timeout kills the process, which bypasses test-fns repeatably retry.
 *        if we throw our own error before jest's timeout, test-fns can catch
 *        the failure and retry the attempt.
 *
 * .usage:
 *   then.repeatably(REPEATABLY_CONFIG)(
 *     'it works',
 *     withTimeout(150_000, async () => {
 *       // test body
 *     }),
 *   );
 */
export const withTimeout = <T>(
  ms: number,
  fn: () => Promise<T>,
): (() => Promise<T>) => {
  return async () => {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`test timeout: exceeded ${ms}ms`));
      }, ms);
    });

    return Promise.race([fn(), timeoutPromise]);
  };
};
