import { convertSkylinkToBase32, formatSkylink } from "./format";

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
