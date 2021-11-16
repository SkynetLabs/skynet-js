import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { buildRequestUrl } from "./client";

import { SkynetClient } from "./index";
import { defaultSkynetPortalUrl } from "./utils/url";

const portalUrl = defaultSkynetPortalUrl;
const client = new SkynetClient(portalUrl);
let mock: MockAdapter;

describe("new SkynetClient", () => {
  it("should not make a portal URL request if portal URL is given", async () => {
    mock = new MockAdapter(axios);
    const client = new SkynetClient(portalUrl);

    const receivedPortalUrl = await client.portalUrl();

    expect(receivedPortalUrl).toEqual(portalUrl);

    expect(mock.history.get.length).toBe(0);
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

    const url = await buildRequestUrl(client, endpointPath, overrideUrl, subdomain, extraPath, query);
    expect(url).toEqual(expectedUrl);
  });

  it("should build a URL from the given components, using the portal URL", async () => {
    const expectedUrl = `https://account.siasky.net/skynet/foo/bar?foo=bar`;

    const url = await buildRequestUrl(client, endpointPath, undefined, subdomain, extraPath, query);
    expect(url).toEqual(expectedUrl);
  });
});
