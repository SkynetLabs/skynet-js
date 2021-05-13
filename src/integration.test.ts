import { genKeyPairAndSeed, SkynetClient } from "./index";
import { trimPrefix, uint8ArrayToStringUtf8 } from "./utils/string";

// To test a specific server, e.g. SKYNET_JS_INTEGRATION_TEST_SERVER=https://eu-fin-1.siasky.net yarn test src/integration.test.ts
const portal = process.env.SKYNET_JS_INTEGRATION_TEST_SERVER || "https://siasky.net";
const client = new SkynetClient(portal);

const dataKey = "HelloWorld";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toEqualPortalUrl(argument: string): R;
    }
  }
}

expect.extend({
  toEqualPortalUrl(received: string, argument: string) {
    const prefix = `${received.split("//", 1)[0]}//`;
    const expectedUrl = trimPrefix(argument, prefix);
    const receivedUrl = trimPrefix(received, prefix);

    // Support the case where we receive siasky.net while expecting eu-fin-1.siasky.net.
    if (!expectedUrl.endsWith(receivedUrl)) {
      return { pass: false, message: () => `expected ${received} to equal ${argument}` };
    }
    return { pass: true, message: () => `expected ${received} not to equal ${argument}` };
  },
});

describe(`Integration test for portal ${portal}`, () => {
  describe("File API integration tests", () => {
    it("Should get existing File API data", async () => {
      const userID = "89e5147864297b80f5ddf29711ba8c093e724213b0dcbefbc3860cc6d598cc35";
      const path = "snew.hns/asdf";
      const expected = { name: "testnames" };

      const { data: received } = await client.file.getJSON(userID, path);
      expect(received).toEqual(expect.objectContaining(expected));
    });
  });

  describe("SkyDB end to end integration tests", () => {
    it("Should get existing SkyDB data", async () => {
      const publicKey = "89e5147864297b80f5ddf29711ba8c093e724213b0dcbefbc3860cc6d598cc35";
      const dataKey = "dataKey1";
      const expected = { message: "hi there" };

      const { data: received } = await client.db.getJSON(publicKey, dataKey);

      expect(expected).toEqual(received);
    });

    it("Should get existing SkyDB data using entry link", async () => {
      const publicKey = "89e5147864297b80f5ddf29711ba8c093e724213b0dcbefbc3860cc6d598cc35";
      const dataKey = "dataKey3";
      const expected = { _data: { message: "hi there!" } };

      const entryLink = await client.registry.getEntryLink(publicKey, dataKey);

      const { data } = await client.getFileContent(entryLink);

      expect(data).toEqual(expect.objectContaining(expected));
    });

    it("Should get existing SkyDB data with unicode data key", async () => {
      const publicKey = "4a964fa1cb329d066aedcf7fc03a249eeea3cf2461811090b287daaaec37ab36";
      const dataKey = "dataKeyż";
      const expected = { message: "Hello" };

      const { data: received } = await client.db.getJSON(publicKey, dataKey);

      expect(expected).toEqual(received);
    });

    it("Should return null for an inexistent entry", async () => {
      const { publicKey } = genKeyPairAndSeed();

      // Try getting an inexistent entry.
      const { data, dataLink } = await client.db.getJSON(publicKey, "foo");
      expect(data).toBeNull();
      expect(dataLink).toBeNull();
    });

    it("Should set and get new entries", async () => {
      const { publicKey, privateKey } = genKeyPairAndSeed();
      const json = { data: "thisistext" };
      const json2 = { data: "foo2" };

      // Set the file in SkyDB.
      await client.db.setJSON(privateKey, dataKey, json);

      // Get the file in SkyDB.
      const { data, dataLink } = await client.db.getJSON(publicKey, dataKey);
      expect(data).toEqual(json);
      expect(dataLink).toBeTruthy();

      // Set the file again.
      await client.db.setJSON(privateKey, dataKey, json2);

      // Get the file again, should have been updated.
      const { data: data2, dataLink: dataLink2 } = await client.db.getJSON(publicKey, dataKey);
      expect(data2).toEqual(json2);
      expect(dataLink2).toBeTruthy();
    });

    // Regression test: Use some strange data keys that have failed in previous versions.
    const dataKeys = [".", "..", "http://localhost:8000/", ""];

    it.each(dataKeys)("Should set and get new entry with dataKey '%s'", async (dataKey) => {
      const { publicKey, privateKey } = genKeyPairAndSeed();
      const json = { data: "thisistext" };

      await client.db.setJSON(privateKey, dataKey, json);

      const { data, dataLink } = await client.db.getJSON(publicKey, dataKey);
      expect(data).toEqual(json);
      expect(dataLink).toBeTruthy();
    });
  });

  describe("Registry end to end integration tests", () => {
    it("Should return null for an inexistent entry", async () => {
      const { publicKey } = genKeyPairAndSeed();

      // Try getting an inexistent entry.
      const { entry, signature } = await client.registry.getEntry(publicKey, "foo");

      expect(entry).toBeNull();
      expect(signature).toBeNull();
    });

    it("Should set and get entries correctly", async () => {
      const { publicKey, privateKey } = genKeyPairAndSeed();

      const entry = {
        dataKey,
        data: "AABRKCTb6z9d-C-Hre-daX4-VIB8L7eydmEr8XRphnS8jg",
        revision: BigInt(0),
      };

      await client.registry.setEntry(privateKey, entry);

      const { entry: returnedEntry } = await client.registry.getEntry(publicKey, dataKey);
      expect(returnedEntry).not.toBeNull();
      expect(typeof returnedEntry!.data).not.toBe("string");
      // @ts-expect-error We know the type of data here.
      returnedEntry.data = uint8ArrayToStringUtf8(returnedEntry.data);

      expect(returnedEntry).toEqual(entry);
    });

    it("Should set and get an entry with empty data correctly", async () => {
      const { publicKey, privateKey } = genKeyPairAndSeed();

      const entry = {
        dataKey,
        data: "",
        revision: BigInt(0),
      };

      await client.registry.setEntry(privateKey, entry);

      const { entry: returnedEntry } = await client.registry.getEntry(publicKey, dataKey);
      expect(returnedEntry).not.toBeNull();
      expect(typeof returnedEntry!.data).not.toBe("string");
      // @ts-expect-error We know the type of data here.
      returnedEntry.data = uint8ArrayToStringUtf8(returnedEntry.data);

      expect(returnedEntry).toEqual(entry);
    });
  });

  describe("Upload and download end-to-end tests", () => {
    const fileData = "testing";
    const json = { key: "testdownload" };
    const plaintextType = "text/plain";
    const plaintextMetadata = {
      filename: dataKey,
      length: fileData.length,
      subfiles: {
        HelloWorld: { filename: dataKey, contenttype: plaintextType, len: fileData.length },
      },
    };

    // TODO: This test is broken in Node.
    // it("Should upload and download directories", async () => {
    //   const directory = {
    //     "i-am-not/file1.jpeg": new File(["foo1"], "i-am-not/file1.jpeg"),
    //     "i-am-not/file2.jpeg": new File(["foo2"], "i-am-not/file2.jpeg"),
    //     "i-am-not/me-neither/file3.jpeg": new File(["foo3"], "i-am-not/me-neither/file3.jpeg"),
    //   };
    //   const dirMetadata = {
    //     filename: "dirname",
    //     length: 12,
    //     subfiles: {
    //       "i-am-not:file1.jpeg": {
    //         contenttype: "image/jpeg",
    //         filename: "i-am-not:file1.jpeg",
    //         len: 4,
    //       },
    //       "i-am-not:file2.jpeg": {
    //         contenttype: "image/jpeg",
    //         filename: "i-am-not:file2.jpeg",
    //         len: 4,
    //         offset: 4,
    //       },
    //       "i-am-not:me-neither:file3.jpeg": {
    //         contenttype: "image/jpeg",
    //         filename: "i-am-not:me-neither:file3.jpeg",
    //         len: 4,
    //         offset: 8,
    //       },
    //     },
    //   };
    //   const dirname = "dirname";
    //   const dirType = "application/zip";

    //   const { skylink } = await client.uploadDirectory(directory, dirname);
    //   expect(skylink).not.toEqual("");

    //   // Get file content and check returned values.

    //   const resp = await client.getFileContent(skylink);
    //   const { data, contentType, metadata, portalUrl, skylink: returnedSkylink } = resp;
    //   expect(data).toEqual(expect.any(String));
    //   expect(contentType).toEqual(dirType);
    //   expect(metadata).toEqual(dirMetadata);
    //   expect(portalUrl).toEqualPortalUrl(portal);
    //   expect(skylink).toEqual(returnedSkylink);
    // });

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
      // TODO: Remove once the metadata changes are in prod.
      const portal = "https://siasky.dev";
      const client = new SkynetClient(portal);

      // Upload the data to acquire its skylink.

      const file = new File([fileData], dataKey, { type: plaintextType });
      const { skylink } = await client.uploadFile(file);
      expect(skylink).not.toEqual("");

      // Get file metadata and check returned values.

      const { metadata } = await client.getMetadata(skylink);

      expect(metadata).toEqual(plaintextMetadata);
      // TODO: Add back in once the endpoint supports these headers.
      // expect(contentType).toEqual("text/plain; charset=utf-8");
      // expect(portalUrl).toEqualPortalUrl(portal);
      // expect(skylink).toEqual(returnedSkylink);
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
  });
});
