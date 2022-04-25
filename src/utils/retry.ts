const DEFAULT_RETRY_COUNT = 10;

/**
 * Retries the given function for the given retryCnt amount of times
 *
 * @param fn - The function to retry
 * @param attemptsLeft - The amount of retries left
 * @returns the result from the given function
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function retry(fn: () => Promise<any>, attemptsLeft: number = DEFAULT_RETRY_COUNT): Promise<any> {
  try {
    return await fn();
  } catch (e) {
    if (attemptsLeft === 0) {
      throw e;
    }
    attemptsLeft -= 1;
    console.log("retrying, attempts left", attemptsLeft);
    console.log("sleeping", (DEFAULT_RETRY_COUNT - attemptsLeft) * 100);
    await sleep((DEFAULT_RETRY_COUNT - attemptsLeft) * 1000);
    return retry(fn, attemptsLeft);
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
