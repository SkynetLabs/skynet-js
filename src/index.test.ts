import { SkynetClient } from "./index";

describe("SkynetClient", () => {
  it("should contain all api methods", () => {
    const client = new SkynetClient();

    // Download
    expect(client).toHaveProperty("downloadFile");
    expect(client).toHaveProperty("downloadFileHns");
    expect(client).toHaveProperty("getHnsUrl");
    expect(client).toHaveProperty("getHnsresUrl");
    expect(client).toHaveProperty("getSkylinkUrl");
    expect(client).toHaveProperty("getMetadata");
    expect(client).toHaveProperty("openFile");
    expect(client).toHaveProperty("openFileHns");
    expect(client).toHaveProperty("resolveHns");

    // Encryption
    expect(client).toHaveProperty("addSkykey");
    expect(client).toHaveProperty("createSkykey");
    expect(client).toHaveProperty("getSkykeyById");
    expect(client).toHaveProperty("getSkykeyByName");
    expect(client).toHaveProperty("getSkykeys");

    // Upload
    expect(client).toHaveProperty("uploadFile");
    expect(client).toHaveProperty("uploadFileRequest");
    expect(client).toHaveProperty("uploadDirectory");
    expect(client).toHaveProperty("uploadDirectoryRequest");

    // SkyDB
    expect(client).toHaveProperty("getFile");
    expect(client).toHaveProperty("setFile");

    // SkyDB helpers
    expect(client).toHaveProperty("lookupRegistry");
    expect(client).toHaveProperty("updateRegistry");
  });
});
