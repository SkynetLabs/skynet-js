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
  it("should build a URL from the given components", async () => {
    const endpointPath = "/skynet/foo";
    const extraPath = "bar";
    const query = { foo: "bar" };
    const expectedUrl = `${portalUrl}/skynet/foo/bar?foo=bar`;

    const url = await buildRequestUrl(client, endpointPath, undefined, extraPath, query);
    expect(url).toEqual(expectedUrl);
  });
});
