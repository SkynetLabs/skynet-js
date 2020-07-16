import SkynetClient from "../src/index";

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
