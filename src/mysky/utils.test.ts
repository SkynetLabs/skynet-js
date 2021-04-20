import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { SkynetClient } from "../client";
import { defaultSkynetPortalUrl } from "../utils/url";

const portalUrl = defaultSkynetPortalUrl;
const client = new SkynetClient(portalUrl);

describe("extractDomain", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    mock.onHead(portalUrl).replyOnce(200, {}, { "skynet-portal-api": portalUrl });
  });

  const domains = [
    ["https://crqa.hns.siasky.net", "crqa.hns"],
    ["https://crqa.hns.siasky.net/", "crqa.hns"],
    ["crqa.hns.siasky.net", "crqa.hns"],
    ["crqa.hns.siasky.net/", "crqa.hns"],
  ];
  it.each(domains)("should extract from URL %s the app domain %s", async (fullUrl, expectedDomain) => {
    const domain = await client.extractDomain(fullUrl);

    expect(domain).toEqual(expectedDomain);
  });
});
