import { client, dataKey, portal } from ".";
import { convertSkylinkToBase64, genKeyPairAndSeed, uriSkynetPrefix } from "../src";
import { randomUnicodeString } from "../utils/testing";

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
      "file1.jpeg": new File(["foo1"], "file1.jpeg"),
      // Test a space in the subfile name.
      "file 2.jpeg": new File(["foo2"], "file 2.jpeg"),
      "subdir/file3.jpeg": new File(["foo3"], "subdir/file3.jpeg"),
    };
    const dirname = "dirname";
    const dirType = "application/zip";

    const { skylink } = await client.uploadDirectory(directory, dirname);
    expect(skylink).not.toEqual("");

    // Get content for the skylink and check returned values.

    {
      const resp = await client.getFileContent(skylink);
      const { data, contentType, portalUrl, skylink: returnedSkylink } = resp;
      expect(data).toEqual(expect.any(String));
      expect(contentType).toEqual(dirType);
      expect(portalUrl).toEqualPortalUrl(portal);
      expect(skylink).toEqual(returnedSkylink);
    }

    // Get file content for each subfile.

    {
      const { data } = await client.getFileContent(`${skylink}/file1.jpeg`);
      expect(data).toEqual("foo1");
    }

    {
      const { data } = await client.getFileContent(`${skylink}/file 2.jpeg`);
      expect(data).toEqual("foo2");
    }

    {
      const { data } = await client.getFileContent(`${skylink}/subdir:file3.jpeg`);
      expect(data).toEqual("foo3");
    }
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

  it("should get file contents when content type is not specified", async () => {
    // Upload the data to acquire its skylink. Don't specify a content type.

    const file = new File([JSON.stringify(json)], dataKey);
    const { skylink } = await client.uploadFile(file);
    expect(skylink).not.toEqual("");

    // Get file content and check returned values.

    const { data, contentType } = await client.getFileContent(skylink);

    expect(typeof data).toEqual("object");
    expect(data).toEqual(json);
    expect(contentType).toEqual("application/octet-stream");
  });

  it('should get binary data with responseType: "arraybuffer"', async () => {
    // Hard-code skylink for a sqlite3 database.
    const skylink = "DABchy1Q3tBUggIP9IF_7ha9vAfBZ1d2aYRxUnHSQg9QNA";

    // Get file content and check returned values.

    const { data, contentType } = await client.getFileContent(skylink, { responseType: "arraybuffer" });

    expect(typeof data).toEqual("object");
    expect(data instanceof ArrayBuffer).toBeTruthy();
    expect(contentType).toEqual("application/octet-stream");
  });

  it("Should upload and download a file with spaces in the filename", async () => {
    const filename = " foo bar ";

    const file = new File(["asdf"], filename);
    expect(file.size).toEqual(4);
    const { skylink } = await client.uploadFile(file);
    expect(skylink).not.toEqual("");

    // Get file content and check returned values.
    const { data } = await client.getFileContent(skylink);

    expect(data).toEqual("asdf");
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

  it("Should upload and download two files with different names and compare their etags", async () => {
    // Generate random filenames.
    const [filename1, filename2] = [randomUnicodeString(16), randomUnicodeString(16)];
    const data = "file";

    // Upload the files.
    const [{ skylink: skylink1 }, { skylink: skylink2 }] = await Promise.all([
      client.uploadFile(new File([data], filename1)),
      client.uploadFile(new File([data], filename2)),
    ]);

    await expectDifferentEtags(skylink1, skylink2);
  });

  it("Should upload and download two files with different contents and compare their etags", async () => {
    // Generate random file data.
    const [data1, data2] = [randomUnicodeString(4096), randomUnicodeString(4096)];
    const filename = "file";

    // Upload the files.
    const [{ skylink: skylink1 }, { skylink: skylink2 }] = await Promise.all([
      client.uploadFile(new File([data1], filename)),
      client.uploadFile(new File([data2], filename)),
    ]);

    await expectDifferentEtags(skylink1, skylink2);
  });

  it("Should update an etag for a resolver skylink after changing its data", async () => {
    const { publicKey, privateKey } = genKeyPairAndSeed();

    // Generate random file data.
    const [data1, data2] = [randomUnicodeString(4096), randomUnicodeString(4096)];
    const filename = "file";

    // Generate a data key and get its entry link.
    const dataKey = randomUnicodeString(16);
    const entryLink = await client.registry.getEntryLink(publicKey, dataKey);

    // Upload two random files.
    const [{ skylink: skylink1 }, { skylink: skylink2 }] = await Promise.all([
      client.uploadFile(new File([data1], filename)),
      client.uploadFile(new File([data2], filename)),
    ]);

    // Set the data link for the first file at a random data key.
    await client.db.setDataLink(privateKey, dataKey, skylink1);

    // Sleep for a bit to account for the portal's load balancer switching
    // servers. This helps ensure that the uploaded files are available.
    await new Promise((r) => setTimeout(r, 3000));

    // Get the entry link's etag.
    const url = await client.getSkylinkUrl(entryLink);
    // @ts-expect-error Calling a private method.
    const response1 = await client.getFileContentRequest(url);
    const etag1 = response1.headers["etag"];
    expect(etag1).toBeTruthy();

    // Set the data link for the second file.
    await client.db.setDataLink(privateKey, dataKey, skylink2);

    // Check that the etag was updated.
    // @ts-expect-error Calling a private method.
    const response2 = await client.getFileContentRequest(url);
    const etag2 = response2.headers["etag"];
    expect(etag2).toBeTruthy();
    expect(etag2).not.toEqual(etag1);
  });

  it("should fail to download a non-existent skylink", async () => {
    // Use a resolver skylink as it will time out faster.
    const skylink = "AQDwh1jnoZas9LaLHC_D4-2yO9XYDdZzNtz62H4Dww1jDB";

    // We use 2 different endpoints depending on the caching mechanism that the
    // portal has been deployed with. With nginx cache (what we used to have
    // before) we had to run every resolver skylink through /skynet/resolve
    // endpoint locally before passing it to the /skynet/skylink endpoint. This
    // endpoint produced "Failed to resolve skylink". These days, portals
    // switched by default from nginx caching to caching in skyd and we made the
    // call to /skynet/resolve conditional - with the skyd caching we're not
    // calling it but we're passing skylink directly to skyd and skyd responds
    // with "Request failed with status code 404: failed to fetch skylink:
    // registry entry not found within given time".
    await expect(client.getFileContent(skylink)).rejects.toThrowError(
      /Failed to resolve skylink|Request failed with status code 404: failed to fetch skylink: registry entry not found within given time/
    );
  });
});

/**
 * Runs the etag test on the given skylinks that expects different etags.
 *
 * @param skylink1 - The first skylink.
 * @param skylink2 - The second skylink.
 */
export async function expectDifferentEtags(skylink1: string, skylink2: string): Promise<void> {
  // The skylinks should differ.
  expect(skylink1).not.toEqual(skylink2);

  // Sleep for a bit to account for the portal's load balancer switching
  // servers. This helps ensure that the uploaded files are available.
  await new Promise((r) => setTimeout(r, 3000));

  // Download the files.
  let [url1, url2] = await Promise.all([client.getSkylinkUrl(skylink1), client.getSkylinkUrl(skylink2)]);
  const [response1, response2] = await Promise.all([
    // @ts-expect-error Calling a private method.
    client.getFileContentRequest(url1),
    // @ts-expect-error Calling a private method.
    client.getFileContentRequest(url2),
  ]);

  // Get the etags.
  const [etag1, etag2] = [response1.headers["etag"], response2.headers["etag"]];
  expect(etag1).toBeTruthy();
  expect(etag2).toBeTruthy();

  // The etags should differ.
  expect(etag1).not.toEqual(etag2);

  // Download the files using nocache.
  [url1, url2] = [`${url1}?nocache=true`, `${url2}?nocache=true`];
  const [response3, response4] = await Promise.all([
    // @ts-expect-error Calling a private method.
    client.getFileContentRequest(url1),
    // @ts-expect-error Calling a private method.
    client.getFileContentRequest(url2),
  ]);

  // The etags should not have changed.
  const [etag3, etag4] = [response3.headers["etag"], response4.headers["etag"]];
  expect(etag3).toEqual(etag1);
  expect(etag4).toEqual(etag2);
}
