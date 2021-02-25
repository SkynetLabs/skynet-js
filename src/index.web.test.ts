import { SkynetClient } from "./index.web";

describe("SkynetClient", () => {
  it("should contain all api methods", () => {
    const client = new SkynetClient();

    // Download
    expect(client).toHaveProperty("downloadFile");
    expect(client).toHaveProperty("downloadFileHns");
    expect(client).toHaveProperty("getFileContent");
    expect(client).toHaveProperty("getFileContentHns");
    expect(client).toHaveProperty("getHnsUrl");
    expect(client).toHaveProperty("getHnsresUrl");
    expect(client).toHaveProperty("getSkylinkUrl");
    expect(client).toHaveProperty("getMetadata");
    expect(client).toHaveProperty("openFile");
    expect(client).toHaveProperty("openFileHns");
    expect(client).toHaveProperty("resolveHns");

    // Upload
    expect(client).toHaveProperty("uploadDirectory");
    expect(client).toHaveProperty("uploadFileContent");
    expect(client).toHaveProperty("uploadFile");

    // SkyDB
    expect(client).toHaveProperty("db");
    expect(client.db).toHaveProperty("getJSON");
    expect(client.db).toHaveProperty("setJSON");

    // SkyDB helpers
    expect(client).toHaveProperty("registry");
    expect(client.registry).toHaveProperty("getEntry");
    expect(client.registry).toHaveProperty("getEntryUrl");
    expect(client.registry).toHaveProperty("setEntry");
  });
});