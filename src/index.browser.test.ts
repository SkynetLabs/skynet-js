import { SkynetClient } from "./index.browser";

describe("SkynetClient", () => {
  it("should contain all api methods", () => {
    const client = new SkynetClient();

    // Download
    expect(client).toHaveProperty("downloadFile", expect.any(Function));
    expect(client).toHaveProperty("downloadFileHns", expect.any(Function));
    expect(client).toHaveProperty("getHnsUrl", expect.any(Function));
    expect(client).toHaveProperty("getHnsresUrl", expect.any(Function));
    expect(client).toHaveProperty("getSkylinkUrl", expect.any(Function));
    expect(client).toHaveProperty("getMetadata", expect.any(Function));
    expect(client).toHaveProperty("openFile", expect.any(Function));
    expect(client).toHaveProperty("openFileHns", expect.any(Function));
    expect(client).toHaveProperty("resolveHns", expect.any(Function));

    // Encryption
    expect(client).toHaveProperty("addSkykey", expect.any(Function));
    expect(client).toHaveProperty("createSkykey", expect.any(Function));
    expect(client).toHaveProperty("getSkykeyById", expect.any(Function));
    expect(client).toHaveProperty("getSkykeyByName", expect.any(Function));
    expect(client).toHaveProperty("getSkykeys", expect.any(Function));

    // Upload
    expect(client).toHaveProperty("uploadFile", expect.any(Function));
    expect(client).toHaveProperty("uploadFileRequest", expect.any(Function));
    expect(client).toHaveProperty("uploadDirectory", expect.any(Function));
    expect(client).toHaveProperty("uploadDirectoryRequest", expect.any(Function));

    // SkyDB
    expect(client).toHaveProperty("db", expect.any(Object));
    expect(client.db).toHaveProperty("getJSON", expect.any(Function));
    expect(client.db).toHaveProperty("setJSON", expect.any(Function));

    // SkyDB helpers
    expect(client).toHaveProperty("registry");
    expect(client.registry).toHaveProperty("getEntry");
    expect(client.registry).toHaveProperty("getEntryUrl");
    expect(client.registry).toHaveProperty("setEntry");
  });
});
