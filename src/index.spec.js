import axios from "axios";
import SkynetClient, { getUrl, download, open, upload, uploadDirectory, parseSkylink } from "./index";

jest.mock("axios");

const portalUrl = "https://siasky.net";
const skylink = "XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg";

describe("SkynetClient", () => {
  it("should contain all api methods", () => {
    const skynetClient = new SkynetClient();

    expect(skynetClient).toHaveProperty("upload");
    expect(skynetClient).toHaveProperty("download");
    expect(skynetClient).toHaveProperty("open");
    expect(skynetClient).toHaveProperty("getUrl");
    expect(skynetClient).toHaveProperty("parseSkylink");
  });
});

describe("getUrl", () => {
  it("should return correctly formed url", () => {
    const url = getUrl(portalUrl, skylink);

    expect(url).toEqual(`${portalUrl}/${skylink}`);
  });

  it("should return correctly formed url with forced download", () => {
    const url = getUrl(portalUrl, skylink, { download: true });

    expect(url).toEqual(`${portalUrl}/${skylink}?attachment=true`);
  });
});

describe("download", () => {
  it("should call window.open with a download url", () => {
    const windowOpen = jest.spyOn(window, "open").mockImplementation();

    download(portalUrl, skylink);

    expect(windowOpen).toHaveBeenCalledWith(`${portalUrl}/${skylink}?attachment=true`, "_blank");
  });
});

describe("open", () => {
  it("should call window.open with a download url", () => {
    const windowOpen = jest.spyOn(window, "open").mockImplementation();

    open(portalUrl, skylink);

    expect(windowOpen).toHaveBeenCalledWith(`${portalUrl}/${skylink}`, "_blank");
  });
});

describe("upload", () => {
  const filename = "image.jpeg";
  const blob = new Blob([], { type: "image/jpeg" });
  const file = new File([blob], filename);

  beforeEach(() => {
    axios.post.mockResolvedValue({ data: { skylink } });
  });

  it("should send post request with FormData", () => {
    upload(portalUrl, file);

    expect(axios.post).toHaveBeenCalledWith(`${portalUrl}/skynet/skyfile`, expect.any(FormData), undefined);
  });

  it("should send register onUploadProgress callback if defined", () => {
    upload(portalUrl, file, { onUploadProgress: jest.fn() });

    expect(axios.post).toHaveBeenCalledWith(`${portalUrl}/skynet/skyfile`, expect.any(FormData), {
      onUploadProgress: expect.any(Function),
    });
  });

  it("should return skylink on success", async () => {
    const data = await upload(portalUrl, file);

    expect(data).toEqual({ skylink });
  });
});

describe("uploadDirectory", () => {
  const blob = new Blob([], { type: "image/jpeg" });
  const filename = "i-am-root";
  const directory = {
    "i-am-not/file1.jpeg": new File([blob], "i-am-not/file1.jpeg"),
    "i-am-not/file2.jpeg": new File([blob], "i-am-not/file2.jpeg"),
    "i-am-not/me-neither/file3.jpeg": new File([blob], "i-am-not/me-neither/file3.jpeg"),
  };

  beforeEach(() => {
    axios.post.mockResolvedValue({ data: { skylink } });
  });

  it("should send post request with FormData", () => {
    uploadDirectory(portalUrl, directory, filename);

    expect(axios.post).toHaveBeenCalledWith(
      `${portalUrl}/skynet/skyfile?filename=${filename}`,
      expect.any(FormData),
      undefined
    );
  });

  it("should send register onUploadProgress callback if defined", () => {
    uploadDirectory(portalUrl, directory, filename, { onUploadProgress: jest.fn() });

    expect(axios.post).toHaveBeenCalledWith(`${portalUrl}/skynet/skyfile?filename=${filename}`, expect.any(FormData), {
      onUploadProgress: expect.any(Function),
    });
  });

  it("should return single skylink on success", async () => {
    const data = await uploadDirectory(portalUrl, directory, filename);

    expect(data).toEqual({ skylink });
  });
});

describe("parseSkylink", () => {
  it("should correctly parse skylink out of different strings", () => {
    expect(parseSkylink(skylink)).toEqual(skylink);
    expect(parseSkylink(`sia:${skylink}`)).toEqual(skylink);
    expect(parseSkylink(`sia://${skylink}`)).toEqual(skylink);
    expect(parseSkylink(`${portalUrl}/${skylink}`)).toEqual(skylink);
    expect(parseSkylink(`${portalUrl}/${skylink}/foo/bar`)).toEqual(skylink);
    expect(parseSkylink(`${portalUrl}/${skylink}?foo=bar`)).toEqual(skylink);
  });

  it("should throw on invalid skylink", () => {
    expect(() => parseSkylink()).toThrowError("Could not extract skylink from ''");
    expect(() => parseSkylink(123)).toThrowError("Skylink has to be a string, number provided");
    expect(() => parseSkylink("123")).toThrowError("Could not extract skylink from '123'");
  });
});
