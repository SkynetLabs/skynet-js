import process from "process";

import axios from "axios";
import minimist from "minimist";

const portal = "siasky.net";
const server_list_endpoint = `https://server-list.hns.${portal}/`;
const timeout = 60_000;

type Server = {
  name: string;
  ip: string;
  last_announce: string;
};

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
  // Get command line arguments.
  const argv = minimist(process.argv.slice(2));

  // Are we getting dev servers?
  const devFlag = argv["dev"];

  const resp = await axios.get(server_list_endpoint);
  const servers: Server[] = resp.data;
  const serverNames = servers
    .filter((server) => {
      const isDevServer = server.name.includes("dev");
      const isXYZServer = server.name.includes("xyz");
      const isCrapServer = server.name.includes("crap");

      // Only include dev servers if dev flag was passed in.
      if (isDevServer || isXYZServer || isCrapServer) {
        return devFlag;
      } else {
        return !devFlag;
      }
    })
    .map((server) => `https://${server.name}`);

  // Server is healthy if the server is operational, which means:
  // 1. it's up
  // 2. it's not disabled
  // 3. it's healthy (all of its checks show "up: true")
  healthy_servers = await filter(serverNames, async (server: string) => {
    const url = `${server}/health-check`;

    try {
      const response = await axios.get(url, { timeout });
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

  process.stdout.write(JSON.stringify(healthy_servers));
})().catch((e) => {
  console.log(e);

  // Couldn't get list of healthy servers. Write empty list of servers.
  process.stdout.write("[]");
});
