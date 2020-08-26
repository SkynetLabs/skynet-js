import { SkynetClient } from "./index";

describe("SkynetClient", () => {
  it("should contain all api methods", () => {
    const client = new SkynetClient();

    // Blocklist
    expect(client).toHaveProperty("getBlocklist");
    expect(client).toHaveProperty("updateBlocklist");

    // Convert
    expect(client).toHaveProperty("convert");

    // Download
    expect(client).toHaveProperty("downloadFile");
    expect(client).toHaveProperty("downloadFileHns");
    expect(client).toHaveProperty("getHnsUrl");
    expect(client).toHaveProperty("getHnsresUrl");
    expect(client).toHaveProperty("getSkylinkUrl");
    expect(client).toHaveProperty("metadata");
    expect(client).toHaveProperty("openFile");
    expect(client).toHaveProperty("openFileHns");
    expect(client).toHaveProperty("resolveSkylinkHns");

    // Encryption
    expect(client).toHaveProperty("addSkykey");
    expect(client).toHaveProperty("createSkykey");
    expect(client).toHaveProperty("getSkykeyById");
    expect(client).toHaveProperty("getSkykeyByName");
    expect(client).toHaveProperty("getSkykeys");

    // List
    expect(client).toHaveProperty("listFiles");

    // Pin
    expect(client).toHaveProperty("pin");
    expect(client).toHaveProperty("unpin");

    // Portals
    expect(client).toHaveProperty("getPortals");
    expect(client).toHaveProperty("updatePortals");

    // Stats
    expect(client).toHaveProperty("getStats");

    // Upload
    expect(client).toHaveProperty("uploadFile");
    expect(client).toHaveProperty("uploadFileRequest");
    expect(client).toHaveProperty("uploadDirectory");
    expect(client).toHaveProperty("uploadDirectoryRequest");
  });
});
