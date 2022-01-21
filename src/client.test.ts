import axios from "axios";
import MockAdapter from "axios-mock-adapter";

import { SkynetClient, URI_SKYNET_PREFIX } from "./index";
import { buildRequestUrl } from "./request";
import { combineStrings } from "../utils/testing";
import { DEFAULT_SKYNET_PORTAL_URL } from "./utils/url";

const portalUrl = DEFAULT_SKYNET_PORTAL_URL;
const client = new SkynetClient(portalUrl);
let mock: MockAdapter;

describe("new SkynetClient", () => {
  beforeEach(() => {
    mock = new MockAdapter(axios);
  });

  it("should not make a portal URL request if portal URL is given", async () => {
    const customPortalUrl = "https://siasky.xyz";
    const client = new SkynetClient(customPortalUrl);

    const receivedPortalUrl = await client.portalUrl();

    expect(receivedPortalUrl).toEqual(customPortalUrl);

    expect(mock.history.get.length).toBe(0);
  });

  describe("no custom portal URL given", () => {
    beforeEach(() => {
      mock = new MockAdapter(axios);
      mock.reset();
    });

    // Is localhost in Node tests.
    const expectedPortalUrl = "http://localhost/";

    // Failure cases.
    //
    // NOTE: the failure tests should be first, so that they run before the
    // portal URL has been successfully resolved (the client will never try to
    // resolve again after it resolved successfully).

    it("should throw if portal does not send skynet-portal-api header", async () => {
      mock.onHead(expectedPortalUrl).replyOnce(200, {}, {});

      // No custom portal passed, so should make request for portal.
      const client = new SkynetClient();

      await expect(client.portalUrl()).rejects.toThrowError("Could not get portal URL for the given portal");
    });

    it("should throw if portal does not send headers", async () => {
      mock.onHead(expectedPortalUrl).replyOnce(200, {});

      // No custom portal passed, so should make request for portal.
      const client = new SkynetClient();

      await expect(client.portalUrl()).rejects.toThrowError(
        "Did not get 'headers' in response despite a successful request. Please try again and report this issue to the devs if it persists."
      );
    });

    // Success cases.

    it("should use default portal if portal URL is not given", async () => {
      mock.onHead(expectedPortalUrl).replyOnce(200, {}, { "skynet-portal-api": expectedPortalUrl });

      const client = new SkynetClient();

      const portalUrl = await client.portalUrl();

      expect(portalUrl).toEqual(expectedPortalUrl);

      expect(mock.history.get.length).toBe(0);
    });
  });
});

describe("buildRequestUrl", () => {
  const endpointPath = "/skynet/foo";
  const subdomain = "account";
  const extraPath = "bar";
  const query = { foo: "bar" };

  it("should build a URL from the given components, using the override URL", async () => {
    const overrideUrl = "siasky.dev";
    const expectedUrl = `https://account.${overrideUrl}/skynet/foo/bar?foo=bar`;

    const url = await buildRequestUrl(client, { baseUrl: overrideUrl, endpointPath, subdomain, extraPath, query });
    expect(url).toEqual(expectedUrl);
  });

  it("should build a URL from the given components, using the portal URL", async () => {
    const expectedUrl = `https://account.siasky.net/skynet/foo/bar?foo=bar`;

    const url = await buildRequestUrl(client, { endpointPath, subdomain, extraPath, query });
    expect(url).toEqual(expectedUrl);
  });

  describe("localhost inputs", () => {
    // `localhost` without a protocol prefix is not in this list because
    // `buildRequestUrl` always ensures a prefix protocol for consistency.
    const validExpectedLocalhosts = combineStrings(["https:", "http:"], ["", "//"], ["localhost"], ["", "/"]);
    const localhostUrls = combineStrings(["", "https://", "https:", "http://", "http:"], ["localhost"], ["", "/"]);

    it.each(localhostUrls)("should correctly handle input '%s'", async (localhostUrl) => {
      const url = await buildRequestUrl(client, { baseUrl: localhostUrl });
      expect(validExpectedLocalhosts).toContainEqual(url);
    });
  });
});

describe("client options", () => {
  const skylink = "XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg";
  const sialink = `${URI_SKYNET_PREFIX}${skylink}`;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    mock.onHead(portalUrl).replyOnce(200, {}, { "skynet-portal-api": portalUrl });
  });

  describe("loginFn", () => {
    it("should call 'loginFn' on a 401 response, and make another attempt at the request", async () => {
      const skynetFileContents = { arbitrary: "json string" };
      const headers = {
        "skynet-portal-api": portalUrl,
        "skynet-skylink": skylink,
        "content-type": "application/json",
      };

      // loginFn should change the value of `loginFnWasCalled`.
      let loginFnWasCalled = false;
      const client = new SkynetClient(portalUrl, {
        loginFn: async () => {
          loginFnWasCalled = true;
        },
      });

      // Return 401 for the first request and 200 for the second.
      const skylinkUrl = await client.getSkylinkUrl(skylink);
      mock.onGet(skylinkUrl).replyOnce(401).onGet(skylinkUrl).replyOnce(200, skynetFileContents, headers);

      const { data, contentType, skylink: skylink2 } = await client.getFileContent(skylink);

      // Assert that we got the expected data.
      expect(data).toEqual(skynetFileContents);
      expect(contentType).toEqual("application/json");
      expect(skylink2).toEqual(sialink);

      // Assert that loginFn was called.
      expect(loginFnWasCalled).toBeTruthy();
    });
  });
});
