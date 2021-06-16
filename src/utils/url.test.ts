import { combineStrings } from "../../utils/testing";
import { trimPrefix, trimSuffix } from "./string";
import { addUrlQuery, defaultSkynetPortalUrl, getFullDomainUrlForPortal, extractDomainForPortal, makeUrl } from "./url";

const portalUrl = defaultSkynetPortalUrl;
const skylink = "XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg";
const skylinkBase32 = "bg06v2tidkir84hg0s1s4t97jaeoaa1jse1svrad657u070c9calq4g";

describe("addUrlQuery", () => {
  const parts: Array<[string, Record<string, unknown>, string]> = [
    [portalUrl, { filename: "test" }, `${portalUrl}/?filename=test`],
    [portalUrl, { attachment: true }, `${portalUrl}/?attachment=true`],
    [`${portalUrl}/path`, { download: true }, `${portalUrl}/path?download=true`],
    [`${portalUrl}/path/`, { download: true }, `${portalUrl}/path/?download=true`],
    [`${portalUrl}/skynet/`, { foo: 1, bar: 2 }, `${portalUrl}/skynet/?foo=1&bar=2`],
    [`${portalUrl}/`, { attachment: true }, `${portalUrl}/?attachment=true`],
    [`${portalUrl}?foo=bar`, { attachment: true }, `${portalUrl}/?foo=bar&attachment=true`],
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
  const domains = [];

  const expectedUrl = "https://dac.hns.siasky.net";
  const hnsDomains = combineStrings(["", "sia:", "sia://"], ["dac.hns"], ["", "/"]);
  domains.push(...hnsDomains.map((domain) => [domain, expectedUrl]));

  const expectedPathUrl = `${expectedUrl}/path/file.json`;
  const hnsPathDomains = combineStrings(hnsDomains, ["/path/file.json"]);
  domains.push(...hnsPathDomains.map((domain) => [domain, expectedPathUrl]));

  const expectedSkylinkUrl = `https://${skylinkBase32}.siasky.net`;
  const skylinkDomains = combineStrings(["", "sia:", "sia://"], [skylinkBase32], ["", "/"]);
  domains.push(...skylinkDomains.map((domain) => [domain, expectedSkylinkUrl]));

  const expectedSkylinkPathUrl = `${expectedSkylinkUrl}/path/file.json`;
  const skylinkPathDomains = combineStrings(skylinkDomains, ["/path/file.json"]);
  domains.push(...skylinkPathDomains.map((domain) => [domain, expectedSkylinkPathUrl]));

  const expectedLocalhostUrl = `localhost`;
  const localhostDomains = combineStrings(["", "sia:", "sia://"], ["localhost"], ["", "/"]);
  domains.push(...localhostDomains.map((domain) => [domain, expectedLocalhostUrl]));

  const expectedLocalhostPathUrl = `${expectedLocalhostUrl}/path/file.json`;
  const localhostPathDomains = combineStrings(localhostDomains, ["/path/file.json"]);
  domains.push(...localhostPathDomains.map((domain) => [domain, expectedLocalhostPathUrl]));

  it.each(domains)("domain %s should return correctly formed full URL %s", (domain, fullUrl) => {
    const url = getFullDomainUrlForPortal(portalUrl, domain);
    expect(url).toEqual(fullUrl);
  });
});

describe("extractDomainForPortal", () => {
  const urls = [];

  // Add simple HNS domain URLs.
  const expectedDomain = "dac.hns";
  const hnsUrls = combineStrings(["", "https://"], ["dac.hns.siasky.net"], ["", "/"]);
  urls.push(...hnsUrls.map((url) => [url, expectedDomain]));

  // Add HNS domain URLs with a path.
  const expectedPathDomain = `${expectedDomain}/path/file.json`;
  const hnsPathUrls = combineStrings(hnsUrls, ["/path/file.json"]);
  urls.push(...hnsPathUrls.map((url) => [url, expectedPathDomain]));

  // Add skylink domain URLs.
  const expectedSkylinkDomain = skylinkBase32;
  const skylinkUrls = combineStrings(["", "https://"], [`${skylinkBase32}.siasky.net`], ["", "/"]);
  urls.push(...skylinkUrls.map((url) => [url, expectedSkylinkDomain]));

  // Add skylink domain URLs with a path.
  const expectedSkylinkPathDomain = `${expectedSkylinkDomain}/path/file.json`;
  const skylinkPathUrls = combineStrings(skylinkUrls, ["/path/file.json"]);
  urls.push(...skylinkPathUrls.map((url) => [url, expectedSkylinkPathDomain]));

  // Add localhost domain URLs.
  const expectedLocalhostDomain = "localhost";
  const localhostUrls = combineStrings(["", "https://"], ["localhost"], ["", "/"]);
  urls.push(...localhostUrls.map((url) => [url, expectedLocalhostDomain]));

  // Add localhost domain URLs with a path.
  const expectedLocalhostPathDomain = `${expectedLocalhostDomain}/path/file.json`;
  const localhostPathUrls = combineStrings(localhostUrls, ["/path/file.json"]);
  urls.push(...localhostPathUrls.map((url) => [url, expectedLocalhostPathDomain]));

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
