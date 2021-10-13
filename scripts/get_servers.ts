import process from "process";

import axios from "axios";

const portal = "siasky.net";
const servers = [
  "as-hk-1",
  "eu-fin-1",
  "eu-fin-2",
  "eu-fin-3",
  "eu-fin-4",
  "eu-ger-1",
  "eu-ger-2",
  "eu-ger-3",
  "eu-ger-4",
  "eu-ger-5",
  "eu-ger-6",
  "eu-ger-7",
  "eu-ger-8",
  "eu-pol-1",
  "eu-pol-2",
  "eu-pol-3",
  "us-or-1",
  "us-or-2",
  "us-pa-1",
  "us-pa-2",
  "us-va-1",
  "us-va-2",
  "us-va-3",
].map((server) => `https://${server}.${portal}`);

/**
 * Filter array asynchronously.
 *
 * @param arr - The array.
 * @param fn - The filter function.
 * @returns - The filtered array.
 */
async function filter<T>(arr: Array<T>, fn: (input: T) => Promise<boolean>): Promise<Array<T>> {
  const fail = Symbol();
  return (await Promise.all(arr.map(async (item) => ((await fn(item)) ? item : fail)))).filter(
    (i) => i !== fail
  ) as Array<T>;
}

let healthy_servers: Array<string> = [];
(async () => {
  // Server is healthy if the server is operational, which means:
  // 1. it's up
  // 2. it's not disabled
  // 3. it's healthy (all of its checks show "up: true")
  healthy_servers = await filter(servers, async (server: string) => {
    const url = `${server}/health-check`;

    try {
      const response = await axios.get(url);
      if (response.data.disabled) {
        // Server disabled.
        return false;
      }

      for (const check of response.data.entry.checks) {
        if (!check.up) {
          // Not healthy; not all checks are up.
          return false;
        }
      }
    } catch (e) {
      // Server not up.
      return false;
    }

    // Server healthy.
    return true;
  });
})().finally(() => {
  process.stdout.write(JSON.stringify(healthy_servers));
});
