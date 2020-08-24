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
    expect(client).toHaveProperty("downloadHns");
    expect(client).toHaveProperty("downloadHnsres");
    expect(client).toHaveProperty("getDownloadUrl");
    expect(client).toHaveProperty("metadata");
    expect(client).toHaveProperty("open");
    expect(client).toHaveProperty("openHns");
    expect(client).toHaveProperty("openHnsres");

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
    expect(client).toHaveProperty("uploadDirectory");
  });
});
