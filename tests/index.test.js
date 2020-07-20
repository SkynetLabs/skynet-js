import SkynetClient from "../src/index";

describe("SkynetClient", () => {
  it("should contain all api methods", () => {
    const skynetClient = new SkynetClient();

    expect(skynetClient).toHaveProperty("download");
    expect(skynetClient).toHaveProperty("getDownloadUrl");
    expect(skynetClient).toHaveProperty("open");

    expect(skynetClient).toHaveProperty("upload");
    expect(skynetClient).toHaveProperty("uploadDirectory");

    expect(skynetClient).toHaveProperty("parseSkylink");
  });
});
