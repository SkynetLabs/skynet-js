import { getUrl, open, parseSkylink } from "../src/index";

const portalUrl = "https://siasky.net";
const skylink = "XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg";
const validSkylinkVariations = [
  skylink,
  `sia:${skylink}`,
  `sia://${skylink}`,
  `${portalUrl}/${skylink}`,
  `${portalUrl}/${skylink}/foo/bar`,
  `${portalUrl}/${skylink}?foo=bar`,
];

describe("getUrl", () => {
  it("should return correctly formed url", () => {
    validSkylinkVariations.forEach((input) => {
      expect(getUrl(portalUrl, input)).toEqual(`${portalUrl}/${skylink}`);
    });
  });

  it("should return correctly formed url with forced download", () => {
    const url = getUrl(portalUrl, skylink, { download: true });

    expect(url).toEqual(`${portalUrl}/${skylink}?attachment=true`);
  });
});

describe("open", () => {
  it("should call window.open with a download url", () => {
    const windowOpen = jest.spyOn(window, "open").mockImplementation();

    validSkylinkVariations.forEach((input) => {
      windowOpen.mockReset();

      open(portalUrl, input);

      expect(windowOpen).toHaveBeenCalledTimes(1);
      expect(windowOpen).toHaveBeenCalledWith(`${portalUrl}/${skylink}`, "_blank");
    });
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
