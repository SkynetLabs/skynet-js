import { SkynetClient } from "./index";

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
    expect(client).toHaveProperty("uploadFile");
    expect(client).toHaveProperty("uploadDirectory");

    // Pin
    expect(client).toHaveProperty("pinSkylink");

    // MySky
    expect(client).toHaveProperty("extractDomain");
    expect(client).toHaveProperty("getFullDomainUrl");
    expect(client).toHaveProperty("loadMySky");

    // File
    expect(client).toHaveProperty("file");
    // v1
    expect(client.file).toHaveProperty("getJSON");
    expect(client.file).toHaveProperty("getEntryData");
    expect(client.file).toHaveProperty("getEntryLink");
    expect(client.file).toHaveProperty("getJSONEncrypted");
    // v2
    expect(client.file).toHaveProperty("getJSONV2");
    expect(client.file).toHaveProperty("getEntryDataV2");
    expect(client.file).toHaveProperty("getEntryLinkV2");
    expect(client.file).toHaveProperty("getJSONEncryptedV2");

    // SkyDB
    expect(client).toHaveProperty("db");
    // v1
    expect(client.db).toHaveProperty("deleteJSON");
    expect(client.db).toHaveProperty("getJSON");
    expect(client.db).toHaveProperty("setJSON");
    expect(client.db).toHaveProperty("setDataLink");
    expect(client.db).toHaveProperty("getRawBytes");
    // v2
    expect(client.db).toHaveProperty("deleteJSONV2");
    expect(client.db).toHaveProperty("getJSONV2");
    expect(client.db).toHaveProperty("setJSONV2");
    expect(client.db).toHaveProperty("setDataLinkV2");
    expect(client.db).toHaveProperty("getRawBytesV2");

    // Registry
    expect(client).toHaveProperty("registry");
    expect(client.registry).toHaveProperty("getEntry");
    expect(client.registry).toHaveProperty("getEntryUrl");
    expect(client.registry).toHaveProperty("getEntryLink");
    expect(client.registry).toHaveProperty("setEntry");
    expect(client.registry).toHaveProperty("postSignedEntry");
  });
});
