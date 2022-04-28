import { SkynetClient } from "./index";

describe("SkynetClient", () => {
  it("should contain all API methods", () => {
    const client = new SkynetClient();

    // Download

    expect(client).toHaveProperty("downloadFile");
    expect(client).toHaveProperty("downloadFileHns");
    expect(client).toHaveProperty("getFileContent");
    expect(client).toHaveProperty("getFileContentBinary");
    expect(client).toHaveProperty("getFileContentHns");
    expect(client).toHaveProperty("getFileContentBinaryHns");
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
    expect(client.file).toHaveProperty("getJSON");
    expect(client.file).toHaveProperty("getEntryData");
    expect(client.file).toHaveProperty("getEntryLink");
    expect(client.file).toHaveProperty("getJSONEncrypted");

    // SkyDB

    // v1
    expect(client).toHaveProperty("db");
    expect(client.db).toHaveProperty("deleteJSON");
    expect(client.db).toHaveProperty("getJSON");
    expect(client.db).toHaveProperty("setJSON");
    expect(client.db).toHaveProperty("setDataLink");
    expect(client.db).toHaveProperty("getRawBytes");
    expect(client.db).toHaveProperty("getEntryData");
    expect(client.db).toHaveProperty("setEntryData");
    expect(client.db).toHaveProperty("deleteEntryData");

    // v2
    expect(client).toHaveProperty("dbV2");
    expect(client.dbV2).toHaveProperty("deleteJSON");
    expect(client.dbV2).toHaveProperty("getJSON");
    expect(client.dbV2).toHaveProperty("setJSON");
    expect(client.dbV2).toHaveProperty("setDataLink");
    expect(client.dbV2).toHaveProperty("getRawBytes");
    expect(client.dbV2).toHaveProperty("getEntryData");
    expect(client.dbV2).toHaveProperty("setEntryData");
    expect(client.dbV2).toHaveProperty("deleteEntryData");

    // Registry

    expect(client).toHaveProperty("registry");
    expect(client.registry).toHaveProperty("getEntry");
    expect(client.registry).toHaveProperty("getEntryUrl");
    expect(client.registry).toHaveProperty("getEntryLink");
    expect(client.registry).toHaveProperty("setEntry");
    expect(client.registry).toHaveProperty("postSignedEntry");
  });
});
