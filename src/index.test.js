import { SkynetClient } from "./index";

describe("SkynetClient", () => {
  it("should contain all api methods", () => {
    const client = new SkynetClient();

    // Download
    expect(client).toHaveProperty("download");
    expect(client).toHaveProperty("getDownloadUrl");
    expect(client).toHaveProperty("open");

    // Upload
    expect(client).toHaveProperty("upload");
    expect(client).toHaveProperty("uploadDirectory");
  });
});
