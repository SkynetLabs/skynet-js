import {
  addUrlQuery,
  defaultSkynetPortalUrl,
  makeUrl,
  parseSkylink,
  trimUriPrefix,
  uriHandshakePrefix,
  uriHandshakeResolverPrefix,
  getFileMimeType,
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
  it("should correctly parse skylink out of different strings", () => {
    const validSkylinkVariations = [
      skylink,
      `sia:${skylink}`,
      `sia://${skylink}`,
      `${portalUrl}/${skylink}`,
      `${portalUrl}/${skylink}/`,
      `${portalUrl}/${skylink}?`,
      `${portalUrl}/${skylink}/foo/bar`,
      `${portalUrl}/${skylink}?foo=bar`,
    ];

    validSkylinkVariations.forEach((input) => {
      expect(parseSkylink(input)).toEqual(skylink);
    });
  });

  it("should throw on invalid skylink", () => {
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
