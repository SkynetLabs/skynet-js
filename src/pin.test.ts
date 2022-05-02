import axios from "axios";
import MockAdapter from "axios-mock-adapter";

import { SkynetClient, DEFAULT_SKYNET_PORTAL_URL, URI_SKYNET_PREFIX } from "./index";

const portalUrl = DEFAULT_SKYNET_PORTAL_URL;
const client = new SkynetClient(portalUrl);
const skylink = "XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg";
const sialink = `${URI_SKYNET_PREFIX}${skylink}`;
const expectedUrl = `${portalUrl}/skynet/pin/${skylink}`;

describe("pinSkylink", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    mock.onHead(portalUrl).replyOnce(200, {}, { "skynet-portal-api": portalUrl });
  });
  const headers = {
    "skynet-skylink": skylink,
  };

  it("Should pin the skylink using the correct URL", async () => {
    mock.onPost(expectedUrl).replyOnce(200, "", headers);

    const { skylink: skylink2 } = await client.pinSkylink(skylink);
    expect(skylink2).toEqual(sialink);
  });

  it("should throw if a path is supplied", async () => {
    mock.onPost(expectedUrl).replyOnce(200, "");

    await expect(client.pinSkylink(`${skylink}/path/file`)).rejects.toThrowError(
      "Skylink string should not contain a path"
    );
  });

  it("should throw if a skylink was not returned", async () => {
    mock.onPost(expectedUrl).replyOnce(200, "", {});

    await expect(client.pinSkylink(skylink)).rejects.toThrowError(
      "Did not get a complete pin response despite a successful request. Please try again and report this issue to the devs if it persists. Error: Expected pin response field 'response.headers[\"skynet-skylink\"]' to be type 'string', was type 'undefined'"
    );
  });

  it("should throw if no data was returned to pinSkylink", async () => {
    mock.onPost(expectedUrl).replyOnce(200, "");

    await expect(client.pinSkylink(skylink)).rejects.toThrowError(
      "Did not get a complete pin response despite a successful request. Please try again and report this issue to the devs if it persists. Error: response.headers field missing"
    );
  });
});
