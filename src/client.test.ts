import axios from "axios";
import MockAdapter from "axios-mock-adapter";

import { SkynetClient } from "./index";
import { defaultSkynetPortalUrl } from "./utils/url";

const portalUrl = defaultSkynetPortalUrl;
let client: SkynetClient;
let mock: MockAdapter;

describe("new SkynetClient", () => {
  it("should not make a portal URL request if portal URL is given", async () => {
    mock = new MockAdapter(axios);
    client = new SkynetClient(portalUrl);

    const receivedPortalUrl = await client.portalUrl();

    expect(receivedPortalUrl).toEqual(portalUrl);

    expect(mock.history.get.length).toBe(0);
  });
});
