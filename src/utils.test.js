import {
  addUrlQuery,
  defaultSkynetPortalUrl,
  makeUrl,
  parseSkylink,
  trimUriPrefix,
  uriHandshakePrefix,
  uriHandshakeResolverPrefix,
} from "./utils";

const portalUrl = defaultSkynetPortalUrl;
const skylink = "XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg";
const hnsLink = "doesn";
const hnsresLink = "doesn";

describe("addUrlQuery", () => {
  it("should return correctly formed URLs with query parameters", () => {
    expect(addUrlQuery(portalUrl, { filename: "test" })).toEqual(`${portalUrl}?filename=test`);
    expect(addUrlQuery(`${portalUrl}/path/`, { download: true })).toEqual(`${portalUrl}/path/?download=true`);
    expect(addUrlQuery(`${portalUrl}/skynet/`, { foo: 1, bar: 2 })).toEqual(`${portalUrl}/skynet/?foo=1&bar=2`);
    expect(addUrlQuery(`${portalUrl}/`, { attachment: true })).toEqual(`${portalUrl}/?attachment=true`);
    expect(addUrlQuery(`${portalUrl}?foo=bar`, { attachment: true })).toEqual(`${portalUrl}?foo=bar&attachment=true`);
    expect(addUrlQuery(`${portalUrl}/?attachment=true`, { foo: "bar" })).toEqual(
      `${portalUrl}/?attachment=true&foo=bar`
    );
    expect(addUrlQuery(`${portalUrl}#foobar`, { foo: "bar" })).toEqual(`${portalUrl}?foo=bar#foobar`);
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
});

describe("trimUriPrefix", () => {
  it("should correctly parse hns prefixed link", () => {
    const validHnsLinkVariations = [hnsLink, `hns:${hnsLink}`, `hns://${hnsLink}`];
    const validHnsresLinkVariations = [hnsresLink, `hnsres:${hnsresLink}`, `hnsres://${hnsresLink}`];

    validHnsLinkVariations.forEach((input) => {
      expect(trimUriPrefix(input, uriHandshakePrefix)).toEqual(hnsLink);
    });
    validHnsresLinkVariations.forEach((input) => {
      expect(trimUriPrefix(input, uriHandshakeResolverPrefix)).toEqual(hnsresLink);
    });
  });
});

describe("parseSkylink", () => {
  it("should correctly parse skylink out of different strings", () => {
    const validSkylinkVariations = [
      [skylink, ""],
      [`${skylink}?foo=bar`, "?foo=bar"],
      [`${skylink}/foo/bar`, "/foo/bar"],
      [`${skylink}#foobar`, "#foobar"],
      [`sia:${skylink}`, ""],
      [`sia://${skylink}`, ""],
      [`${portalUrl}/${skylink}`, ""],
      [`${portalUrl}/${skylink}/`, "/"],
      [`${portalUrl}/${skylink}?`, ""],
      [`${portalUrl}/${skylink}/foo/bar`, "/foo/bar"],
      [`${portalUrl}/${skylink}/foo%3Fbar`, "/foo%3Fbar"],
      [`${portalUrl}/${skylink}/foo/bar?foo=bar`, "/foo/bar?foo=bar"],
      [`${portalUrl}/${skylink}?foo=bar`, "?foo=bar"],
      [`${portalUrl}/${skylink}/?foo=bar`, "/?foo=bar"],
      [`${portalUrl}/${skylink}#foobar`, "#foobar"],
      [`${portalUrl}/${skylink}/#foobar`, "/#foobar"],
    ];

    validSkylinkVariations.forEach(([fullSkylink, path]) => {
      expect(parseSkylink(fullSkylink)).toEqual(`${skylink}${path}`);
    });
  });

  it("should throw on invalid skylink", () => {
    expect(() => parseSkylink()).toThrowError("Skylink has to be a string, undefined provided");
    expect(() => parseSkylink(123)).toThrowError("Skylink has to be a string, number provided");
    expect(() => parseSkylink("123")).toThrowError("Could not extract skylink from '123'");
    expect(() => parseSkylink(`${skylink}xxx`)).toThrowError(`Could not extract skylink from '${skylink}xxx'`);
    expect(() => parseSkylink(`${skylink}xxx/foo`)).toThrowError(`Could not extract skylink from '${skylink}xxx/foo'`);
    expect(() => parseSkylink(`${skylink}xxx?foo`)).toThrowError(`Could not extract skylink from '${skylink}xxx?foo'`);
  });
});
