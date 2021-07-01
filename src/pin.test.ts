import axios from "axios";
import MockAdapter from "axios-mock-adapter";

import { SkynetClient, defaultSkynetPortalUrl, uriSkynetPrefix } from "./index";

const portalUrl = defaultSkynetPortalUrl;
const client = new SkynetClient(portalUrl);
const skylink = "XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg";
const sialink = `${uriSkynetPrefix}${skylink}`;
const expectedUrl = `${portalUrl}/skynet/pin/${skylink}`;

describe("getFileContent", () => {
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
      "Did not get a complete pin response despite a successful request. Please try again and report this issue to the devs if it persists. Error: Expected pin response field 'response.headers[\"skynet-skylink\"]' to be type 'string', was 'undefined'"
    );
  });

  it("should throw if no data was returned to pinSkylink", async () => {
    mock.onPost(expectedUrl).replyOnce(200, "");

    await expect(client.pinSkylink(skylink)).rejects.toThrowError(
      "Did not get a complete pin response despite a successful request. Please try again and report this issue to the devs if it persists. Error: response.headers field missing"
    );
  });
});
