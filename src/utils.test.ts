import {
  addUrlQuery,
  defaultSkynetPortalUrl,
  makeUrl,
  parseSkylink,
  trimUriPrefix,
  uriHandshakePrefix,
  uriHandshakeResolverPrefix,
  getFileMimeType,
  convertSkylinkToBase32,
} from "./utils";

function combineStrings(...arrays: Array<Array<string>>) {
  return arrays.reduce((acc, array) => {
    return acc.map((first) => array.map((second) => first.concat(second))).reduce((acc, cases) => [...acc, ...cases]);
  });
}

const portalUrl = defaultSkynetPortalUrl;
const skylink = "XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg";
const skylinkBase32 = "bg06v2tidkir84hg0s1s4t97jaeoaa1jse1svrad657u070c9calq4g";
const portalUrlSubdomain = `https://${skylinkBase32}.siasky.net`;
const hnsLink = "doesn";
const hnsresLink = "doesn";

describe("addUrlQuery", () => {
  it("should return correctly formed URLs with query parameters", () => {
    expect(addUrlQuery(portalUrl, { filename: "test" })).toEqual(`${portalUrl}?filename=test`);
    expect(addUrlQuery(`${portalUrl}/path/`, { download: true })).toEqual(`${portalUrl}/path/?download=true`);
    expect(addUrlQuery(`${portalUrl}/skynet/`, { foo: 1, bar: 2 })).toEqual(`${portalUrl}/skynet/?foo=1&bar=2`);
    expect(addUrlQuery(`${portalUrl}/`, { attachment: true })).toEqual(`${portalUrl}/?attachment=true`);
  });
});

describe("convertSkylinkToBase32", () => {
  it("should convert the base64 skylink to base32", () => {
    const encoded = convertSkylinkToBase32(skylink);

    expect(encoded).toEqual(skylinkBase32);
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
  const basicCases = combineStrings(
    ["", "sia:", "sia://", "https://siasky.net/", "https://foo.siasky.net/"],
    [skylink],
    ["", "/", "/foo", "/foo", "/foo/", "/foo/bar", "/foo/bar/"],
    ["", "?", "?foo=bar", "?foo=bar&bar=baz"],
    ["", "#", "#foo", "#foo?bar"]
  );

  it.each(basicCases)("should extract skylink from %s", (input) => {
    expect(parseSkylink(input)).toEqual(skylink);
  });

  const subdomainCases = combineStrings(
    ["https://"],
    [skylinkBase32],
    [".siasky.net", ".foo.siasky.net"],
    ["", "/", "/foo", "/foo", "/foo/", "/foo/bar", "/foo/bar/"],
    ["", "?", "?foo=bar", "?foo=bar&bar=baz"],
    ["", "#", "#foo", "#foo?bar"]
  );

  it.each(subdomainCases)("should extract base32 skylink from %s", (input) => {
    expect(parseSkylink(input, { subdomain: true })).toEqual(skylinkBase32);
  });

  it("should throw on invalid skylink", () => {
    const badUrl = `https://${skylinkBase32}xxx.siasky.net`;
    expect(() => parseSkylink(badUrl, { subdomain: true })).toThrowError(`Could not extract skylink from '${badUrl}'`);

    // @ts-expect-error we only check this use case in case someone ignores typescript typing
    expect(() => parseSkylink()).toThrowError("Skylink has to be a string, undefined provided");
    // @ts-expect-error we only check this use case in case someone ignores typescript typing
    expect(() => parseSkylink(123)).toThrowError("Skylink has to be a string, number provided");
    expect(() => parseSkylink("123")).toThrowError("Could not extract skylink from '123'");
    expect(() => parseSkylink(`${skylink}xxx`)).toThrowError(`Could not extract skylink from '${skylink}xxx'`);
    expect(() => parseSkylink(`${skylink}xxx/foo`)).toThrowError(`Could not extract skylink from '${skylink}xxx/foo'`);
    expect(() => parseSkylink(`${skylink}xxx?foo`)).toThrowError(`Could not extract skylink from '${skylink}xxx?foo'`);
  });
});

describe("getFileMimeType", () => {
  it("should return file type if type is specified on a file", () => {
    const file = new File([], "foobar.baz", { type: "foo/bar" });

    expect(getFileMimeType(file)).toEqual("foo/bar");
  });

  describe("when there is no file type", () => {
    it("should guess the file type based on the extension", () => {
      // list a few popular extensions just to be sure the mime db works
      expect(getFileMimeType(new File([], "foo.html"))).toEqual("text/html");
      expect(getFileMimeType(new File([], "foo.txt"))).toEqual("text/plain");
      expect(getFileMimeType(new File([], "foo.json"))).toEqual("application/json");
    });

    it("should return empty file type if there is no file extension", () => {
      const file = new File([], "foobar");

      expect(getFileMimeType(file)).toEqual("");
    });

    it("should return empty file type if the extension is not matched to any mime type", () => {
      const file = new File([], "foobar.baz");

      expect(getFileMimeType(file)).toEqual("");
    });
  });
});
