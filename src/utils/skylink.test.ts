import { convertSkylinkToBase32, formatSkylink, parseSkylink, parseSkylinkBase32 } from "./skylink";
import { combineStrings, extractNonSkylinkPath } from "../../utils/testing";

const skylink = "XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg";
const skylinkBase32 = "bg06v2tidkir84hg0s1s4t97jaeoaa1jse1svrad657u070c9calq4g";

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
    expect(() => parseSkylink()).toThrowError("Expected parameter 'skylinkUrl' to be type 'string', was 'undefined'");
    // @ts-expect-error we only check this use case in case someone ignores typescript typing
    expect(() => parseSkylink(123)).toThrowError("Expected parameter 'skylinkUrl' to be type 'string', was '123'");
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
