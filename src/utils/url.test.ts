import { combineStrings } from "../../utils/testing";
import { trimPrefix, trimSuffix } from "./string";
import {
  addUrlQuery,
  defaultSkynetPortalUrl,
  getFullDomainUrlForPortal,
  extractDomainForPortal,
  makeUrl,
  addUrlSubdomain,
} from "./url";

const portalUrl = defaultSkynetPortalUrl;
const skylink = "XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg";
const skylinkBase32 = "bg06v2tidkir84hg0s1s4t97jaeoaa1jse1svrad657u070c9calq4g";

describe("addUrlSubdomain", () => {
  const parts: Array<[string, string, string]> = [
    [portalUrl, "test", `https://test.siasky.net`],
    [`${portalUrl}/`, "test", `https://test.siasky.net`],
    [portalUrl, "foo.bar", `https://foo.bar.siasky.net`],
    [`${portalUrl}/path`, "test", `https://test.siasky.net/path`],
    [`${portalUrl}/path/`, "test", `https://test.siasky.net/path`],
    [`${portalUrl}?foo=bar`, "test", `https://test.siasky.net/?foo=bar`],
    [`${portalUrl}#foobar`, "test", `https://test.siasky.net/#foobar`],
  ];

  it.each(parts)(
    "Should call addUrlSubdomain with URL %s and parameters %s and form URL %s",
    (inputUrl, subdomain, expectedUrl) => {
      const url = addUrlSubdomain(inputUrl, subdomain);
      expect(url).toEqual(expectedUrl);
    }
  );
});

describe("addUrlQuery", () => {
  const parts: Array<[string, { [key: string]: string | undefined }, string]> = [
    [portalUrl, { filename: "test" }, `${portalUrl}/?filename=test`],
    [`${portalUrl}/`, { attachment: "true" }, `${portalUrl}/?attachment=true`],
    [portalUrl, { attachment: "true" }, `${portalUrl}/?attachment=true`],
    [`${portalUrl}/path`, { download: "true" }, `${portalUrl}/path?download=true`],
    [`${portalUrl}/path/`, { download: "true" }, `${portalUrl}/path/?download=true`],
    [`${portalUrl}/skynet/`, { foo: "1", bar: "2" }, `${portalUrl}/skynet/?foo=1&bar=2`],
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

/**
 * Adds the given inputs with the expected output as test cases to the array.
 *
 * @param cases - The test cases array to append to.
 * @param inputs - The given inputs.
 * @param expected - The expected output for all the inputs.
 */
function addTestCases(cases: Array<[string, string]>, inputs: Array<string>, expected: string): void {
  const mappedInputs: Array<[string, string]> = inputs.map((input) => [input, expected]);
  cases.push(...mappedInputs);
}

describe("getFullDomainUrlForPortal", () => {
  const domains: Array<[string, string]> = [];
  // The casing in the path should not be affected by URL parsing.
  const path = "/path/File.json";

  const expectedUrl = "https://dac.hns.siasky.net";
  // Test with uppercase to ensure that it is properly converted to lowercase.
  const hnsDomains = combineStrings(["", "sia:", "sia://", "SIA:", "SIA://"], ["dac.hns", "DAC.HNS"], ["", "/"]);
  addTestCases(domains, hnsDomains, expectedUrl);

  const expectedPathUrl = `${expectedUrl}${path}`;
  const hnsPathDomains = combineStrings(hnsDomains, [path]);
  addTestCases(domains, hnsPathDomains, expectedPathUrl);

  const expectedSkylinkUrl = `https://${skylinkBase32}.siasky.net`;
  const skylinkDomains = combineStrings(["", "sia:", "sia://"], [skylinkBase32], ["", "/"]);
  addTestCases(domains, skylinkDomains, expectedSkylinkUrl);

  const expectedSkylinkPathUrl = `${expectedSkylinkUrl}${path}`;
  const skylinkPathDomains = combineStrings(skylinkDomains, [path]);
  addTestCases(domains, skylinkPathDomains, expectedSkylinkPathUrl);

  const expectedLocalhostUrl = `localhost`;
  const localhostDomains = combineStrings(["", "sia:", "sia://"], ["localhost"], ["", "/"]);
  addTestCases(domains, localhostDomains, expectedLocalhostUrl);

  const expectedLocalhostPathUrl = `${expectedLocalhostUrl}${path}`;
  const localhostPathDomains = combineStrings(localhostDomains, [path]);
  addTestCases(domains, localhostPathDomains, expectedLocalhostPathUrl);

  it.each(domains)("domain %s should return correctly formed full URL %s", (domain, fullUrl) => {
    const url = getFullDomainUrlForPortal(portalUrl, domain);
    expect(url).toEqual(fullUrl);
  });
});

describe("extractDomainForPortal", () => {
  const urls: Array<[string, string]> = [];
  // The casing in the path should not be affected by URL parsing.
  const path = "/path/File.json";

  // Add simple HNS domain URLs.
  const expectedDomain = "dac.hns";
  // Test with uppercase to ensure that it is properly converted to lowercase by the URL parsing.
  const hnsUrls = combineStrings(["", "https://", "HTTPS://"], ["dac.hns.siasky.net", "DAC.HNS.SIASKY.NET"], ["", "/"]);
  addTestCases(urls, hnsUrls, expectedDomain);

  // Add HNS domain URLs with a path.
  const expectedPathDomain = `${expectedDomain}${path}`;
  const hnsPathUrls = combineStrings(hnsUrls, [path]);
  addTestCases(urls, hnsPathUrls, expectedPathDomain);

  // Add skylink domain URLs.
  const expectedSkylinkDomain = skylinkBase32;
  const skylinkUrls = combineStrings(["", "https://"], [`${skylinkBase32}.siasky.net`], ["", "/"]);
  addTestCases(urls, skylinkUrls, expectedSkylinkDomain);

  // Add skylink domain URLs with a path.
  const expectedSkylinkPathDomain = `${expectedSkylinkDomain}${path}`;
  const skylinkPathUrls = combineStrings(skylinkUrls, [path]);
  addTestCases(urls, skylinkPathUrls, expectedSkylinkPathDomain);

  // Add localhost domain URLs.
  const expectedLocalhostDomain = "localhost";
  const localhostUrls = combineStrings(["", "https://"], ["localhost"], ["", "/"]);
  addTestCases(urls, localhostUrls, expectedLocalhostDomain);

  // Add localhost domain URLs with a path.
  const expectedLocalhostPathDomain = `${expectedLocalhostDomain}${path}`;
  const localhostPathUrls = combineStrings(localhostUrls, [path]);
  addTestCases(urls, localhostPathUrls, expectedLocalhostPathDomain);

  // Add traditional URLs.
  const expectedTraditionalUrlDomain = "traditionalurl.com";
  const traditionalUrls = combineStrings(["", "https://"], ["traditionalUrl.com"], ["", "/"]);
  addTestCases(urls, traditionalUrls, expectedTraditionalUrlDomain);

  // Add traditional URLs with a path.
  const expectedTraditionalUrlPathDomain = `${expectedTraditionalUrlDomain}${path}`;
  const traditionalPathUrls = combineStrings(traditionalUrls, [path]);
  addTestCases(urls, traditionalPathUrls, expectedTraditionalUrlPathDomain);

  // Add traditional URLs with subdomains.
  const expectedTraditionalUrlSubdomain = "subdomain.traditionalurl.com";
  const traditionalSubdomainUrls = combineStrings(["", "https://"], ["subdomain.traditionalUrl.com"], ["", "/"]);
  addTestCases(urls, traditionalSubdomainUrls, expectedTraditionalUrlSubdomain);

  it.each(urls)("should extract from full url %s the domain %s", (fullDomain, domain) => {
    const receivedDomain = extractDomainForPortal(portalUrl, fullDomain);
    expect(receivedDomain).toEqual(domain);
  });
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
