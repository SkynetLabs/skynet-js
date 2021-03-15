import { getFileMimeType, getRelativeFilePath, getRootDirectory } from "./file";
import { assertUint64, MAX_REVISION } from "./number";
import {
  convertSkylinkToBase32,
  formatSkylink,
  parseSkylink,
  parseSkylinkBase32,
  uriHandshakePrefix,
  uriHandshakeResolverPrefix,
} from "./skylink";
import { hexToUint8Array, trimUriPrefix } from "./string";
import { addUrlQuery, defaultSkynetPortalUrl, makeUrl } from "./url";
import { combineStrings, extractNonSkylinkPath } from "../../utils/testing";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toEqualUint8Array(argument: Uint8Array): R;
    }
  }
}

expect.extend({
  // source https://stackoverflow.com/a/60818105/6085242
  toEqualUint8Array(received: Uint8Array, argument: Uint8Array) {
    if (received.length !== argument.length) {
      return { pass: false, message: () => `expected ${received} to equal ${argument}` };
    }
    for (let i = 0; i < received.length; i++) {
      if (received[i] !== argument[i]) {
        return { pass: false, message: () => `expected ${received} to equal ${argument}` };
      }
    }
    return { pass: true, message: () => `expected ${received} not to equal ${argument}` };
  },
});

const portalUrl = defaultSkynetPortalUrl;
const skylink = "XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg";
const skylinkBase32 = "bg06v2tidkir84hg0s1s4t97jaeoaa1jse1svrad657u070c9calq4g";
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

describe("assertUint64", () => {
  it("should test the assertUint64 function", () => {
    expect(() => assertUint64(BigInt(0))).not.toThrow();
    expect(() => assertUint64(BigInt(-1))).toThrow();
    expect(() => assertUint64(MAX_REVISION)).not.toThrow();
    expect(() => assertUint64(MAX_REVISION + BigInt(1))).toThrow();
  });
});

describe("convertSkylinkToBase32", () => {
  it("should convert the base64 skylink to base32", () => {
    const encoded = convertSkylinkToBase32(skylink);

    expect(encoded).toEqual(skylinkBase32);
  });
});

describe("formatSkylink", () => {
  it("should ensure the skylink starts with the prefix", () => {
    const prefixedSkylink = `sia:${skylink}`;

    expect(formatSkylink(skylink)).toEqual(prefixedSkylink);
    expect(formatSkylink(prefixedSkylink)).toEqual(prefixedSkylink);
  });

  it("should not prepend a prefix for the empty string", () => {
    expect(formatSkylink("")).toEqual("");
  });
});

describe("getRelativeFilePath", () => {
  const filepaths = [
    ["abc/def", "def"],
    ["./abc/def", "def"],
    ["/abc/def.txt", "def.txt"],
  ];

  it.each(filepaths)("the relative file path for a file with the path %s should be %s", (filepath, directory) => {
    const file = new File(["test contents"], "foo");
    // @ts-expect-error We spoof the path here which is present in browsers but not in the File standard.
    file.path = filepath;
    expect(getRelativeFilePath(file)).toEqual(directory);
  });
});

describe("getRootDirectory", () => {
  const filepaths = [
    ["abc/def", "abc"],
    ["./abc/def", "abc"],
    ["/abc/def", "abc"],
  ];

  it.each(filepaths)("the root directory for a file with the path %s should be %s", (filepath, directory) => {
    const file = new File(["test contents"], "foo");
    // @ts-expect-error We spoof the path here which is present in browsers but not in the File standard.
    file.path = filepath;
    expect(getRootDirectory(file)).toEqual(directory);
  });
});

describe("hexToUint8Array", () => {
  const hexStrings: Array<[string, number[]]> = [
    ["ff", [255]],
    ["a", [10]],
    ["ff0a", [255, 10]],
  ];

  it.each(hexStrings)("the hex string '%s' should be decoded to %s", (str, array) => {
    const byteArray = hexToUint8Array(str);
    expect(byteArray).toEqualUint8Array(new Uint8Array(array));
  });

  const invalidHexStrings = ["xyz", "aabbzz", ""];

  it.each(invalidHexStrings)("should throw on invalid input '%s'", (str) => {
    expect(() => hexToUint8Array(str)).toThrowError(`Input string '${str}' is not a valid hex-encoded string`);
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
  const basicCases = combineStrings(
    ["", "sia:", "sia://", "https://siasky.net/", "https://foo.siasky.net/", `https://${skylinkBase32}.siasky.net/`],
    [skylink],
    ["", "/", "//", "/foo", "/foo/", "/foo/bar", "/foo/bar/"],
    ["", "?", "?foo=bar", "?foo=bar&bar=baz"],
    ["", "#", "#foo", "#foo?bar"]
  );

  it.each(basicCases)("should extract skylink and path from %s", (fullSkylink) => {
    expect(parseSkylink(fullSkylink)).toEqual(skylink);

    // Check that we extract the path correctly.
    const path = extractNonSkylinkPath(fullSkylink, skylink);
    const fullPath = `${skylink}${path}`;

    expect(parseSkylink(fullSkylink, { includePath: true })).toEqual(fullPath);
    expect(parseSkylink(fullSkylink, { onlyPath: true })).toEqual(path);
  });

  const subdomainCases = combineStrings(
    ["https://"],
    [skylinkBase32],
    [".siasky.net", ".foo.siasky.net"],
    ["", "/", "//", "/foo", "/foo", "/foo/", "/foo/bar", "/foo/bar/", `/${skylink}`],
    ["", "?", "?foo=bar", "?foo=bar&bar=baz"],
    ["", "#", "#foo", "#foo?bar"]
  );

  it.each(subdomainCases)("should extract base32 skylink from %s", (fullSkylink) => {
    expect(parseSkylink(fullSkylink, { fromSubdomain: true })).toEqual(skylinkBase32);
    expect(parseSkylinkBase32(fullSkylink)).toEqual(skylinkBase32);

    // Test the fromSubdomain and onlyPath options together.
    const path = extractNonSkylinkPath(fullSkylink, ""); // Don't need to remove the skylink from the path portion here.
    expect(parseSkylink(fullSkylink, { fromSubdomain: true, onlyPath: true })).toEqual(path);
  });

  it("should return null on invalid skylink", () => {
    // @ts-expect-error we only check this use case in case someone ignores typescript typing
    expect(() => parseSkylink()).toThrowError("Skylink has to be a string, undefined provided");
    // @ts-expect-error we only check this use case in case someone ignores typescript typing
    expect(() => parseSkylink(123)).toThrowError("Skylink has to be a string, number provided");
  });

  const invalidCases = ["123", `${skylink}xxx`, `${skylink}xxx/foo`, `${skylink}xxx?foo`];

  it.each(invalidCases)("should return null on invalid case %s", (fullSkylink) => {
    expect(parseSkylink(fullSkylink)).toBeNull();
  });

  it("should return null on invalid base32 subdomain", () => {
    const badUrl = `https://${skylinkBase32}xxx.siasky.net`;
    expect(parseSkylink(badUrl, { fromSubdomain: true })).toBeNull();
  });

  it("should reject invalid combinations of options", () => {
    expect(() => {
      parseSkylink("test", { includePath: true, onlyPath: true });
    }).toThrow();
    expect(() => {
      parseSkylink("test", { includePath: true, fromSubdomain: true });
    }).toThrow();
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
