import { convertSkylinkToBase32, convertSkylinkToBase64, formatSkylink } from "./format";
import { uriSkynetPrefix } from "../utils/url";

const skylinkBase64 = "XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg";
const skylinkBase32 = "bg06v2tidkir84hg0s1s4t97jaeoaa1jse1svrad657u070c9calq4g";

describe("convertSkylinkToBase32", () => {
  it("should convert the base64 skylink to base32", () => {
    const encoded = convertSkylinkToBase32(skylinkBase64);

    expect(encoded).toEqual(skylinkBase32);
  });
});

describe("convertSkylinkToBase64", () => {
  it("should convert the base32 skylink to base64", () => {
    const encoded = convertSkylinkToBase64(skylinkBase32);

    expect(encoded).toEqual(skylinkBase64);
  });
});

describe("formatSkylink", () => {
  it("should ensure the skylink starts with the prefix", () => {
    const prefixedSkylink = `${uriSkynetPrefix}${skylinkBase64}`;

    expect(formatSkylink(skylinkBase64)).toEqual(prefixedSkylink);
    expect(formatSkylink(prefixedSkylink)).toEqual(prefixedSkylink);
  });

  it("should not prepend a prefix for the empty string", () => {
    expect(formatSkylink("")).toEqual("");
  });
});
