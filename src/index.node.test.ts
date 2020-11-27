import { SkynetClient } from "./index.node";

describe("SkynetClient", () => {
  it("should contain all api methods", () => {
    const client = new SkynetClient();

    // Download
    expect(client).toHaveProperty("downloadFile", undefined);
    expect(client).toHaveProperty("downloadFileHns", undefined);
    expect(client).toHaveProperty("getHnsUrl", expect.any(Function));
    expect(client).toHaveProperty("getHnsresUrl", expect.any(Function));
    expect(client).toHaveProperty("getSkylinkUrl", expect.any(Function));
    expect(client).toHaveProperty("getMetadata", expect.any(Function));
    expect(client).toHaveProperty("openFile", undefined);
    expect(client).toHaveProperty("openFileHns", undefined);
    expect(client).toHaveProperty("resolveHns", expect.any(Function));

    // Encryption
    expect(client).toHaveProperty("addSkykey", expect.any(Function));
    expect(client).toHaveProperty("createSkykey", expect.any(Function));
    expect(client).toHaveProperty("getSkykeyById", expect.any(Function));
    expect(client).toHaveProperty("getSkykeyByName", expect.any(Function));
    expect(client).toHaveProperty("getSkykeys", expect.any(Function));

    // Upload
    expect(client).toHaveProperty("uploadFile", undefined);
    expect(client).toHaveProperty("uploadFileRequest", undefined);
    expect(client).toHaveProperty("uploadDirectory", undefined);
    expect(client).toHaveProperty("uploadDirectoryRequest", undefined);

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
