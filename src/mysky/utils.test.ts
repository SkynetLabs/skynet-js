import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { combineArrays, combineStrings, composeTestCases } from "../../utils/testing";
import { SkynetClient } from "../client";
import { DEFAULT_SKYNET_PORTAL_URL } from "../utils/url";
import { getRedirectUrlOnPreferredPortal, shouldRedirectToPreferredPortalUrl } from "./utils";

const portalUrl = DEFAULT_SKYNET_PORTAL_URL;
const client = new SkynetClient(portalUrl);

describe("extractDomain", () => {
  let mock: MockAdapter;

  const serverPortalDomain = "us-va-1.siasky.net";
  const serverPortalUrl = `https://${serverPortalDomain}`;
  const serverClient = new SkynetClient(serverPortalDomain);

  beforeEach(() => {
    mock = new MockAdapter(axios);
    // Responses for regular portal.
    mock
      .onHead(portalUrl)
      .replyOnce(200, {}, { "skynet-server-api": serverPortalUrl })
      .onHead(portalUrl)
      .replyOnce(200, {}, { "skynet-portal-api": portalUrl });
  });

  const cases = [
    ["https://crqa.hns.siasky.net", "crqa.hns"],
    ["https://crqa.hns.siasky.net/", "crqa.hns"],
    ["crqa.hns.siasky.net", "crqa.hns"],
    ["crqa.hns.siasky.net/", "crqa.hns"],
    ["localhost", "localhost"],
  ];
  const serverCases = cases.map(([fullDomain, domain]) => [
    fullDomain.replace("siasky.net", serverPortalDomain),
    domain,
  ]);

  it.each(cases)(
    `should extract from full URL '%s' the app domain '%s' using portal '${portalUrl}'`,
    async (fullUrl, expectedDomain) => {
      const domain = await client.extractDomain(fullUrl);

      expect(domain).toEqual(expectedDomain);
    }
  );

  it.each(serverCases)(
    `should extract from full URL '%s' the app domain '%s' using portal '${serverPortalDomain}' and client on the same portal`,
    async (fullUrl, expectedDomain) => {
      // Responses for portal on server URL.
      mock
        .onHead(serverPortalUrl)
        .replyOnce(200, {}, { "skynet-server-api": serverPortalUrl })
        .onHead(serverPortalUrl)
        .replyOnce(200, {}, { "skynet-portal-api": portalUrl });

      const domain = await serverClient.extractDomain(fullUrl);

      expect(domain).toEqual(expectedDomain);
    }
  );

  it.each(serverCases)(
    `should extract from full URL '%s' the app domain '%s' using portal '${serverPortalDomain}' and client on the portal '${portalUrl}'`,
    async (fullUrl, expectedDomain) => {
      const domain = await client.extractDomain(fullUrl);

      expect(domain).toEqual(expectedDomain);
    }
  );

  it("should just return the full domain if the full domain does not contain the portal domain", async () => {
    const inputDomain = "crqa.hns.asdf.net";

    const domain = await client.extractDomain(inputDomain);

    expect(domain).toEqual(inputDomain);
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

// Test different variations of prefixes and trailing slashes.
const portal1Urls = combineStrings(["", "http://", "https://", "HTTPS://"], ["siasky.net"], ["", "/"]);
const portal2Urls = combineStrings(["", "http://", "https://", "HTTPS://"], ["siasky.xyz"], ["", "/"]);

// TODO: Test cases with portal servers.
describe("getRedirectUrlOnPreferredPortal", () => {
  const portal1SkappUrls = combineStrings(["", "https://"], ["skapp.hns.siasky.net"], ["", "/"]);
  const portal2SkappUrls = combineStrings(["", "https://"], ["skapp.hns.siasky.xyz"], ["", "/"]);

  const cases: Array<[string, string, string, string]> = [
    // Test redirecting from one portal to another.
    ...(composeTestCases(combineArrays(portal1SkappUrls, portal2Urls), "https://skapp.hns.siasky.xyz").map(
      ([[a, b], c]) => ["siasky.net", a, b, c]
    ) as [string, string, string, string][]),
    ...(composeTestCases(combineArrays(portal2SkappUrls, portal1Urls), "https://skapp.hns.siasky.net").map(
      ([[a, b], c]) => ["siasky.xyz", a, b, c]
    ) as [string, string, string, string][]),
  ];

  it.each(cases)(
    "('%s', '%s', '%s') should return '%s'",
    (portalUrl, currentUrl, preferredPortalUrl, expectedResult) => {
      const result = getRedirectUrlOnPreferredPortal(portalUrl, currentUrl, preferredPortalUrl);
      expect(result).toEqual(expectedResult);
    }
  );
});

// TODO: Add cases with portal servers.
// Test the function that checks whether two portals are equal for the purposes
// of redirecting the user to a preferred portal.
describe("shouldRedirectToPreferredPortalUrl", () => {
  const cases: Array<[string, string, boolean]> = [
    // Add cases where the portal URLs are the same.
    ...composeTestCases(combineArrays(portal1Urls, portal1Urls), true),
    // Test cases where the portals are different.
    ...composeTestCases(combineArrays(portal1Urls, portal2Urls), false),
    ...composeTestCases(combineArrays(portal2Urls, portal1Urls), false),
  ].map(([[a, b], c]) => [a, b, c]);

  it.each(cases)("('%s', '%s') should return '%s'", (currentPortalUrl, preferredPortalUrl, expectedResult) => {
    const result = shouldRedirectToPreferredPortalUrl(currentPortalUrl, preferredPortalUrl);
    expect(result).toEqual(expectedResult);
  });
});
