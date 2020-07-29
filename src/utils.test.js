import { makeUrl, makeUrlWithSkylink, parseSkylink, defaultSkynetPortalUrl } from "./utils";

const portalUrl = defaultSkynetPortalUrl;
const skylink = "XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg";
const validSkylinkVariations = [
  skylink,
  `sia:${skylink}`,
  `sia://${skylink}`,
  `${portalUrl}/${skylink}`,
  `${portalUrl}/${skylink}/foo/bar`,
  `${portalUrl}/${skylink}?foo=bar`,
];

describe("makeUrl", () => {
  it("should return correctly formed URLs", () => {
    expect(makeUrl(portalUrl, "/")).toEqual(`${portalUrl}/`);
    expect(makeUrl(portalUrl, "/", { attachment: true })).toEqual(`${portalUrl}/?attachment=true`);
    expect(makeUrl(portalUrl, "/skynet")).toEqual(`${portalUrl}/skynet`);
    expect(makeUrl(portalUrl, "/skynet/")).toEqual(`${portalUrl}/skynet/`);
    expect(makeUrl(portalUrl, "/skynet/", { foo: 1, bar: 2 })).toEqual(`${portalUrl}/skynet/?foo=1&bar=2`);

    expect(makeUrlWithSkylink(portalUrl, "/", skylink)).toEqual(`${portalUrl}/${skylink}`);
    expect(makeUrlWithSkylink(portalUrl, "/skynet", skylink)).toEqual(`${portalUrl}/skynet/${skylink}`);
    expect(makeUrlWithSkylink(portalUrl, "/skynet/", skylink)).toEqual(`${portalUrl}/skynet/${skylink}`);
  });
});

describe("parseSkylink", () => {
  it("should correctly parse skylink out of different strings", () => {
    validSkylinkVariations.forEach((input) => {
      expect(parseSkylink(input)).toEqual(skylink);
    });
  });

  it("should throw on invalid skylink", () => {
    expect(() => parseSkylink()).toThrowError("Could not extract skylink from ''");
    expect(() => parseSkylink(123)).toThrowError("Skylink has to be a string, number provided");
    expect(() => parseSkylink("123")).toThrowError("Could not extract skylink from '123'");
  });
});
