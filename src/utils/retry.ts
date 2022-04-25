const DEFAULT_RETRY_COUNT = 10;

/**
 * Retries the given function for the given retryCnt amount of times
 *
 * @param fn - The function to retry
 * @param context - Context to the retry for logging purposes
 * @param attemptsLeft - The amount of retries left
 * @returns the result from the given function
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function retry(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fn: () => Promise<any>,
  context = "",
  attemptsLeft: number = DEFAULT_RETRY_COUNT
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  try {
    return await fn();
  } catch (e) {
    if (attemptsLeft === 0) {
      throw e;
    }
    attemptsLeft -= 1;
    if (attemptsLeft === 0) {
      console.log(`last retry, context ${context}`);
    }
    await sleep((DEFAULT_RETRY_COUNT - attemptsLeft) * 1000);
    return retry(fn, context, attemptsLeft);
  }
}

/**
 * Sleeps for a number of milliseconds before resolving.
 *
 * @param ms - The number of milliseconds to sleep.
 * @returns void
 */
async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
