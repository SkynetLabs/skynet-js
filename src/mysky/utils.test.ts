import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { SkynetClient } from "../client";
import { defaultSkynetPortalUrl } from "../utils/url";
import { padFileSize } from "./utils";

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
    ["localhost", "localhost"],
  ];
  it.each(domains)("Should extract from URL %s the app domain %s", async (fullUrl, expectedDomain) => {
    const domain = await client.extractDomain(fullUrl);

    expect(domain).toEqual(expectedDomain);
  });
});

describe("getFullDomainUrl", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    mock.onHead(portalUrl).replyOnce(200, {}, { "skynet-portal-api": portalUrl });
  });

  const domains = [
    ["crqa.hns", "https://crqa.hns.siasky.net"],
    ["crqa.hns/", "https://crqa.hns.siasky.net"],
    ["localhost", "localhost"],
    ["localhost/", "localhost"],
  ];

  it.each(domains)("Should turn domain %s into full URL %s", async (domain, expectedUrl) => {
    const fullUrl = await client.getFullDomainUrl(domain);

    expect(fullUrl).toEqual(expectedUrl);
  });
});

describe("padFileSize", () => {
  const kib = 1 << 10;
  const sizes = [
    [1 * kib, 4 * kib],
    [4 * kib, 4 * kib],
    [5 * kib, 8 * kib],
    [105 * kib, 112 * kib],
    [305 * kib, 320 * kib],
    [351 * kib, 352 * kib],
    [352 * kib, 352 * kib],
  ];

  it.each(sizes)("Should pad the file size %s to %s", (initialSize, expectedSize) => {
    const size = padFileSize(initialSize);
    expect(size).toEqual(expectedSize);
  });

  it("Should throw on a really big number.", () => {
    expect(() => padFileSize(Number.MAX_SAFE_INTEGER)).toThrowError("Could not pad file size, overflow detected.");
  });
});
