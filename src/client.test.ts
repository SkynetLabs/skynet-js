import axios from "axios";
import MockAdapter from "axios-mock-adapter";

import { SkynetClient } from "./index";
import { defaultSkynetPortalUrl } from "./utils/url";

const portalUrl = defaultSkynetPortalUrl;
let client: SkynetClient;
let mock: MockAdapter;

describe("new SkynetClient", () => {
  it("should fail to initialize if portal URL header is not found", async () => {
    mock = new MockAdapter(axios);
    mock.onHead(portalUrl).replyOnce(200, {}, {});
    client = new SkynetClient(portalUrl);

    await expect(client.portalUrl).rejects.toThrowError("Could not get portal URL for the given portal");
  });
});
