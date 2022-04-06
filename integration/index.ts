/* istanbul ignore file: Incomplete coverage reported erroneously, no line numbers given */

import { DEFAULT_SKYNET_PORTAL_URL, SkynetClient } from "../src";
import { trimPrefix } from "../src/utils/string";

// To test a specific server.
//
// Example:
//
// SKYNET_JS_INTEGRATION_TEST_SERVER=https://eu-fin-1.siasky.net yarn run jest integration
export const portal = process.env.SKYNET_JS_INTEGRATION_TEST_SERVER || DEFAULT_SKYNET_PORTAL_URL;
// Allow setting a custom API key for e.g. authentication for running tests on paid portals.
//
// Example:
//
// SKYNET_JS_INTEGRATION_TEST_SKYNET_API_KEY=foo yarn run jest integration
export const skynetApiKey = process.env.SKYNET_JS_INTEGRATION_TEST_SKYNET_API_KEY;
// Allow setting custom cookies.
//
// Example:
//
// SKYNET_JS_INTEGRATION_TEST_CUSTOM_COOKIE=skynet-jwt=foo yarn run jest integration
export const customCookie = process.env.SKYNET_JS_INTEGRATION_TEST_CUSTOM_COOKIE;

export const customOptions = { skynetApiKey, customCookie };
export const client = new SkynetClient(portal, customOptions);

export const dataKey = "HelloWorld";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toEqualPortalUrl(argument: string): R;
      toEqualUint8Array(argument: Uint8Array): R;
    }
  }
}

expect.extend({
  toEqualPortalUrl(received: string, argument: string) {
    // The received prefix, e.g. "https://" or "http://".
    const prefix = `${received.split("//", 1)[0]}//`;
    const expectedUrl = trimPrefix(argument, prefix);
    const receivedUrl = trimPrefix(received, prefix);

    // Support the case where we receive siasky.net while expecting eu-fin-1.siasky.net.
    if (!expectedUrl.endsWith(receivedUrl) && !receivedUrl.endsWith(expectedUrl)) {
      return { pass: false, message: () => `expected portal '${received}' to equal '${argument}'` };
    }
    return { pass: true, message: () => `expected portal '${received}' not to equal '${argument}'` };
  },

  // source https://stackoverflow.com/a/60818105/6085242
  toEqualUint8Array(received: Uint8Array, argument: Uint8Array) {
    if (received.length !== argument.length) {
      return { pass: false, message: () => `expected ${received} to equal ${argument}` };
    }
    for (let i = 0; i < received.length; i++) {
      if (received[i] !== argument[i]) {
        return { pass: false, message: () => `expected ${received} to equal ${argument}` };
      }
    }
    return { pass: true, message: () => `expected ${received} not to equal ${argument}` };
  },
});
