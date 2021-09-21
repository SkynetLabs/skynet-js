import { client, dataKey, portal } from ".";
import { convertSkylinkToBase64, uriSkynetPrefix } from "../src";

describe(`Upload and download end-to-end tests for portal '${portal}'`, () => {
  const fileData = "testing";
  const json = { key: "testdownload" };
  const plaintextType = "text/plain";
  const plaintextMetadata = {
    filename: dataKey,
    length: fileData.length,
    subfiles: {
      HelloWorld: { filename: dataKey, contenttype: plaintextType, len: fileData.length },
    },
    tryfiles: ["index.html"],
  };

  it("Should get file content for an existing entry link of depth 1", async () => {
    const entryLink = "AQDwh1jnoZas9LaLHC_D4-2yP9XYDdZzNtz62H4Dww1jDA";
    const expectedDataLink = `${uriSkynetPrefix}XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg`;

    const { skylink } = await client.getFileContent(entryLink);
    expect(skylink).toEqual(expectedDataLink);
  });

  it("Should get file content for an existing entry link of depth 2", async () => {
    const entryLinkBase32 = "0400mgds8arrfnu8e6b0sde9fbkmh4nl2etvun55m0fvidudsb7bk78";
    const entryLink = convertSkylinkToBase64(entryLinkBase32);
    const expectedDataLink = `${uriSkynetPrefix}EAAFgq17B-MKsi0ARYKUMmf9vxbZlDpZkA6EaVBCG4YBAQ`;

    const { skylink } = await client.getFileContent(entryLink);
    expect(skylink).toEqual(expectedDataLink);
  });

  it("Should upload and download directories", async () => {
    const directory = {
      "i-am-not/file1.jpeg": new File(["foo1"], "i-am-not/file1.jpeg"),
      "i-am-not/file2.jpeg": new File(["foo2"], "i-am-not/file2.jpeg"),
      "i-am-not/me-neither/file3.jpeg": new File(["foo3"], "i-am-not/me-neither/file3.jpeg"),
    };
    const dirname = "dirname";
    const dirType = "application/zip";

    const { skylink } = await client.uploadDirectory(directory, dirname);
    expect(skylink).not.toEqual("");

    // Get file content and check returned values.

    const resp = await client.getFileContent(skylink);
    const { data, contentType, portalUrl, skylink: returnedSkylink } = resp;
    expect(data).toEqual(expect.any(String));
    expect(contentType).toEqual(dirType);
    expect(portalUrl).toEqualPortalUrl(portal);
    expect(skylink).toEqual(returnedSkylink);
  });

  it("Custom filenames should take effect", async () => {
    const customFilename = "asdf!!";

    // Upload the data with a custom filename.

    const file = new File([fileData], dataKey);
    const { skylink } = await client.uploadFile(file, { customFilename });
    expect(skylink).not.toEqual("");

    // Get file metadata and check filename.

    const { metadata } = await client.getMetadata(skylink);
    expect(metadata).toEqual(expect.objectContaining({ filename: customFilename }));
  });

  it("Should get plaintext file contents", async () => {
    // Upload the data to acquire its skylink.

    const file = new File([fileData], dataKey, { type: plaintextType });
    const { skylink } = await client.uploadFile(file);
    expect(skylink).not.toEqual("");

    // Get file content and check returned values.

    const { data, contentType, portalUrl, skylink: returnedSkylink } = await client.getFileContent(skylink);
    expect(data).toEqual(fileData);
    expect(contentType).toEqual("text/plain");
    expect(portalUrl).toEqualPortalUrl(portal);
    expect(skylink).toEqual(returnedSkylink);
  });

  it("Should get plaintext file metadata", async () => {
    // Upload the data to acquire its skylink.

    const file = new File([fileData], dataKey, { type: plaintextType });
    const { skylink } = await client.uploadFile(file);
    expect(skylink).not.toEqual("");

    // Get file metadata and check returned values.

    const { metadata, portalUrl, skylink: returnedSkylink } = await client.getMetadata(skylink);

    expect(metadata).toEqual(plaintextMetadata);
    expect(portalUrl).toEqualPortalUrl(portal);
    expect(skylink).toEqual(returnedSkylink);
  });

  it("Should get JSON file contents", async () => {
    // Upload the data to acquire its skylink.
    const file = new File([JSON.stringify(json)], dataKey, { type: "application/json" });
    const { skylink } = await client.uploadFile(file);

    const { data, contentType } = await client.getFileContent(skylink);
    expect(data).toEqual(expect.any(Object));
    expect(data).toEqual(json);
    expect(contentType).toEqual("application/json");
  });

  it("Should get file contents when content type is not specified but inferred from filename", async () => {
    // Upload the data to acquire its skylink. Content type is inferred from filename.

    const file = new File([JSON.stringify(json)], `${dataKey}.json`);
    const { skylink } = await client.uploadFile(file);
    expect(skylink).not.toEqual("");

    // Get file content and check returned values.

    const { data, contentType } = await client.getFileContent(skylink);

    expect(data).toEqual(expect.any(Object));
    expect(data).toEqual(json);
    expect(contentType).toEqual("application/json");
  });

  it("Should get file contents when content type is not specified", async () => {
    // Upload the data to acquire its skylink. Don't specify a content type.

    const file = new File([JSON.stringify(json)], dataKey);
    const { skylink } = await client.uploadFile(file);
    expect(skylink).not.toEqual("");

    // Get file content and check returned values.

    const { data, contentType } = await client.getFileContent(skylink);

    expect(data).toEqual(expect.any(Object));
    expect(data).toEqual(json);
    expect(contentType).toEqual("application/octet-stream");
  });

  it("Should upload and download a 0-byte file", async () => {
    const onProgress = (progress: number) => {
      expect(progress).toEqual(1);
    };

    const file = new File([""], dataKey);
    expect(file.size).toEqual(0);
    const { skylink } = await client.uploadFile(file, { onUploadProgress: onProgress });
    expect(skylink).not.toEqual("");

    // Get file content and check returned values.
    const { data } = await client.getFileContent(skylink, { onDownloadProgress: onProgress });

    expect(data).toEqual("");
  });

  it("Should upload and download a 1-byte file", async () => {
    const filedata = "a";
    const onProgress = (progress: number) => {
      expect(progress).toBeLessThanOrEqual(1);
    };

    const file = new File([filedata], dataKey);
    expect(file.size).toEqual(filedata.length);
    const { skylink } = await client.uploadFile(file, { onUploadProgress: onProgress });
    expect(skylink).not.toEqual("");

    // Get file content and check returned values.
    const { data } = await client.getFileContent(skylink, { onDownloadProgress: onProgress });

    expect(data).toEqual(filedata);
  });
});
