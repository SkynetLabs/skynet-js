import { defaultDownloadOptions, defaultPortalUrl, download, getDownloadUrl, open } from "./index";

const portalUrl = defaultPortalUrl;
const skylink = "XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg";
const validSkylinkVariations = [
  skylink,
  `sia:${skylink}`,
  `sia://${skylink}`,
  `${portalUrl}/${skylink}`,
  `${portalUrl}/${skylink}/foo/bar`,
  `${portalUrl}/${skylink}?foo=bar`,
];

describe("download", () => {
  it("should call window.open with a download url with attachment set", () => {
    const windowOpen = jest.spyOn(window, "open").mockImplementation();

    validSkylinkVariations.forEach((input) => {
      windowOpen.mockReset();

      download(portalUrl, input, defaultDownloadOptions);

      expect(windowOpen).toHaveBeenCalledTimes(1);
      expect(windowOpen).toHaveBeenCalledWith(`${portalUrl}/${skylink}?attachment=true`, "_blank");
    });
  });
});

describe("getDownloadUrl", () => {
  it("should return correctly formed download URL", () => {
    validSkylinkVariations.forEach((input) => {
      expect(getDownloadUrl(portalUrl, input)).toEqual(`${portalUrl}/${skylink}`);
    });
  });

  it("should return correctly formed url with forced download", () => {
    const url = getDownloadUrl(portalUrl, skylink, { download: true });

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
