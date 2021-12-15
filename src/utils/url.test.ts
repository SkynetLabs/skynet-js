import { composeTestCases, combineStrings } from "../../utils/testing";
import { trimPrefix, trimSuffix } from "./string";
import {
  addUrlQuery,
  DEFAULT_SKYNET_PORTAL_URL,
  getFullDomainUrlForPortal,
  extractDomainForPortal,
  makeUrl,
} from "./url";

const portalUrl = DEFAULT_SKYNET_PORTAL_URL;
const skylink = "XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg";
const skylinkBase32 = "bg06v2tidkir84hg0s1s4t97jaeoaa1jse1svrad657u070c9calq4g";

describe("addUrlQuery", () => {
  const parts: Array<[string, { [key: string]: string | undefined }, string]> = [
    [portalUrl, { filename: "test" }, `${portalUrl}/?filename=test`],
    [portalUrl, { attachment: "true" }, `${portalUrl}/?attachment=true`],
    [`${portalUrl}/path`, { download: "true" }, `${portalUrl}/path?download=true`],
    [`${portalUrl}/path/`, { download: "true" }, `${portalUrl}/path/?download=true`],
    [`${portalUrl}/skynet/`, { foo: "1", bar: "2" }, `${portalUrl}/skynet/?foo=1&bar=2`],
    [`${portalUrl}/`, { attachment: "true" }, `${portalUrl}/?attachment=true`],
    [`${portalUrl}?foo=bar`, { attachment: "true" }, `${portalUrl}/?foo=bar&attachment=true`],
    [`${portalUrl}/?attachment=true`, { foo: "bar" }, `${portalUrl}/?attachment=true&foo=bar`],
    [`${portalUrl}#foobar`, { foo: "bar" }, `${portalUrl}/?foo=bar#foobar`],
  ];

  it.each(parts)(
    "Should call addUrlQuery with URL %s and parameters %s and form URL %s",
    (inputUrl, params, expectedUrl) => {
      const url = addUrlQuery(inputUrl, params);
      expect(url).toEqual(expectedUrl);
    }
  );
});

describe("getFullDomainUrlForPortal", () => {
  // The casing in the path should not be affected by URL parsing.
  const path = "/path/File.json";

  const expectedUrl = "https://dac.hns.siasky.net";
  // Test with uppercase to ensure that it is properly converted to lowercase.
  const hnsDomains = combineStrings(["", "sia:", "sia://", "SIA:", "SIA://"], ["dac.hns", "DAC.HNS"], ["", "/"]);

  const expectedPathUrl = `${expectedUrl}${path}`;
  const hnsPathDomains = combineStrings(hnsDomains, [path]);

  const expectedSkylinkUrl = `https://${skylinkBase32}.siasky.net`;
  const skylinkDomains = combineStrings(["", "sia:", "sia://"], [skylinkBase32], ["", "/"]);

  const expectedSkylinkPathUrl = `${expectedSkylinkUrl}${path}`;
  const skylinkPathDomains = combineStrings(skylinkDomains, [path]);

  const expectedLocalhostUrl = `localhost`;
  const localhostDomains = combineStrings(["", "sia:", "sia://"], ["localhost"], ["", "/"]);

  const expectedLocalhostPathUrl = `${expectedLocalhostUrl}${path}`;
  const localhostPathDomains = combineStrings(localhostDomains, [path]);

  const cases: Array<[string, string]> = [
    ...composeTestCases(hnsDomains, expectedUrl),
    ...composeTestCases(hnsPathDomains, expectedPathUrl),
    ...composeTestCases(skylinkDomains, expectedSkylinkUrl),
    ...composeTestCases(skylinkPathDomains, expectedSkylinkPathUrl),
    ...composeTestCases(localhostDomains, expectedLocalhostUrl),
    ...composeTestCases(localhostPathDomains, expectedLocalhostPathUrl),
  ];
  const xyzCases = cases.map(([domain, fullUrl]) => [domain, fullUrl.replace("siasky.net", "siasky.xyz")]);

  it.each(cases)(
    `domain '%s' should return correctly formed full URL '%s' using portal '${portalUrl}'`,
    (domain, fullUrl) => {
      const url = getFullDomainUrlForPortal(portalUrl, domain);
      expect(url).toEqual(fullUrl);
    }
  );

  it.each(xyzCases)(
    `domain '%s' should return correctly formed full URL '%s' using portal 'siasky.xyz'`,
    (domain, fullUrl) => {
      const url = getFullDomainUrlForPortal("siasky.xyz", domain);
      expect(url).toEqual(fullUrl);
    }
  );
});

describe("extractDomainForPortal", () => {
  // The casing in the path should not be affected by URL parsing.
  const path = "/path/File.json";

  // Add simple HNS domain URLs.
  const expectedDomain = "dac.hns";
  // Test with uppercase to ensure that it is properly converted to lowercase by the URL parsing.
  const hnsUrls = combineStrings(
    ["", "http://", "https://", "HTTPS://"],
    ["dac.hns.siasky.net", "DAC.HNS.SIASKY.NET"],
    ["", "/"]
  );

  // Add HNS domain URLs with a path.
  const expectedPathDomain = `${expectedDomain}${path}`;
  const hnsPathUrls = combineStrings(hnsUrls, [path]);

  // Add skylink domain URLs.
  const expectedSkylinkDomain = skylinkBase32;
  const skylinkUrls = combineStrings(["", "https://"], [`${skylinkBase32}.siasky.net`], ["", "/"]);

  // Add skylink domain URLs with a path.
  const expectedSkylinkPathDomain = `${expectedSkylinkDomain}${path}`;
  const skylinkPathUrls = combineStrings(skylinkUrls, [path]);

  // Add localhost domain URLs.
  const expectedLocalhostDomain = "localhost";
  const localhostUrls = combineStrings(["", "https://"], ["localhost"], ["", "/"]);

  // Add localhost domain URLs with a path.
  const expectedLocalhostPathDomain = `${expectedLocalhostDomain}${path}`;
  const localhostPathUrls = combineStrings(localhostUrls, [path]);

  // Add traditional URLs.
  const expectedTraditionalUrlDomain = "traditionalurl.com";
  const traditionalUrls = combineStrings(["", "https://"], ["traditionalUrl.com"], ["", "/"]);

  // Add traditional URLs with a path.
  const expectedTraditionalUrlPathDomain = `${expectedTraditionalUrlDomain}${path}`;
  const traditionalPathUrls = combineStrings(traditionalUrls, [path]);

  // Add traditional URLs with subdomains.
  const expectedTraditionalUrlSubdomain = "subdomain.traditionalurl.com";
  const traditionalSubdomainUrls = combineStrings(["", "https://"], ["subdomain.traditionalUrl.com"], ["", "/"]);

  const cases: Array<[string, string]> = [
    ...composeTestCases(hnsUrls, expectedDomain),
    ...composeTestCases(hnsPathUrls, expectedPathDomain),
    ...composeTestCases(skylinkUrls, expectedSkylinkDomain),
    ...composeTestCases(skylinkPathUrls, expectedSkylinkPathDomain),
    ...composeTestCases(localhostUrls, expectedLocalhostDomain),
    ...composeTestCases(localhostPathUrls, expectedLocalhostPathDomain),
    ...composeTestCases(traditionalUrls, expectedTraditionalUrlDomain),
    ...composeTestCases(traditionalPathUrls, expectedTraditionalUrlPathDomain),
    ...composeTestCases(traditionalSubdomainUrls, expectedTraditionalUrlSubdomain),
  ];
  const xyzCases = cases.map(([fullDomain, domain]) => [
    fullDomain.replace("siasky.net", "siasky.xyz").replace("SIASKY.NET", "SIASKY.XYZ"),
    domain,
  ]);

  it.each(cases)(
    `should extract from full url '%s' the domain '%s' using portal '${portalUrl}'`,
    (fullDomain, domain) => {
      const receivedDomain = extractDomainForPortal(portalUrl, fullDomain);
      expect(receivedDomain).toEqual(domain);
    }
  );

  it.each(xyzCases)(
    `should extract from full url '%s' the domain '%s' using portal 'siasky.xyz'`,
    (fullDomain, domain) => {
      const receivedDomain = extractDomainForPortal("siasky.xyz", fullDomain);
      expect(receivedDomain).toEqual(domain);
    }
  );
});

describe("makeUrl", () => {
  it("should return correctly formed URLs", () => {
    expect(makeUrl(portalUrl, "/")).toEqual(`${portalUrl}/`);
    expect(makeUrl(portalUrl, "/skynet")).toEqual(`${portalUrl}/skynet`);
    expect(makeUrl(portalUrl, "/skynet/")).toEqual(`${portalUrl}/skynet/`);

    expect(makeUrl(portalUrl, "/", skylink)).toEqual(`${portalUrl}/${skylink}`);
    expect(makeUrl(portalUrl, "/skynet", skylink)).toEqual(`${portalUrl}/skynet/${skylink}`);
    expect(makeUrl(portalUrl, "//skynet/", skylink)).toEqual(`${portalUrl}/skynet/${skylink}`);
    expect(makeUrl(portalUrl, "/skynet/", `${skylink}?foo=bar`)).toEqual(`${portalUrl}/skynet/${skylink}?foo=bar`);
    expect(makeUrl(portalUrl, `${skylink}/?foo=bar`)).toEqual(`${portalUrl}/${skylink}?foo=bar`);
    expect(makeUrl(portalUrl, `${skylink}#foobar`)).toEqual(`${portalUrl}/${skylink}#foobar`);
  });

  it("Should throw if no args provided", () => {
    expect(() => makeUrl()).toThrowError("Expected parameter 'args' to be non-empty, was type 'object', value ''");
  });
});

describe("trimPrefix", () => {
  it("should trim the prefix with limit if passed", () => {
    expect(trimPrefix("//asdf", "/", 1)).toEqual("/asdf");
    expect(trimPrefix("//asdf", "/", 0)).toEqual("//asdf");
  });
});

describe("trimSuffix", () => {
  it("should trim the suffix with limit if passed", () => {
    expect(trimSuffix("asdf//", "/", 1)).toEqual("asdf/");
    expect(trimSuffix("asdf//", "/", 0)).toEqual("asdf//");
  });
});
