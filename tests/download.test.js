import { download } from "../src/index";

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

describe("download", () => {
  it("should call window.open with a download url", () => {
    const windowOpen = jest.spyOn(window, "open").mockImplementation();

    validSkylinkVariations.forEach((input) => {
      windowOpen.mockReset();

      download(portalUrl, input);

      expect(windowOpen).toHaveBeenCalledTimes(1);
      expect(windowOpen).toHaveBeenCalledWith(`${portalUrl}/${skylink}?attachment=true`, "_blank");
    });
  });
});
