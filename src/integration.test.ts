import { hashDataKey } from "./crypto";
import { genKeyPairAndSeed, SkynetClient } from "./index";
import { decodeSkylinkBase64 } from "./utils/encoding";
import { stringToUint8ArrayUtf8, toHexString, trimPrefix } from "./utils/string";
import { uriSkynetPrefix } from "./utils/url";

// To test a specific server, e.g. SKYNET_JS_INTEGRATION_TEST_SERVER=https://eu-fin-1.siasky.net yarn test src/integration.test.ts
const portal = process.env.SKYNET_JS_INTEGRATION_TEST_SERVER || "https://siasky.net";
const client = new SkynetClient(portal);

const dataKey = "HelloWorld";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toEqualPortalUrl(argument: string): R;
      toEqualUint8Array(argument: Uint8Array): R;
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

  // source https://stackoverflow.com/a/60818105/6085242
  toEqualUint8Array(received: Uint8Array, argument: Uint8Array) {
    if (received.length !== argument.length) {
      return { pass: false, message: () => `expected ${received} to equal ${argument}` };
    }
    for (let i = 0; i < received.length; i++) {
      if (received[i] !== argument[i]) {
        return { pass: false, message: () => `expected ${received} to equal ${argument}` };
      }
    }
    return { pass: true, message: () => `expected ${received} not to equal ${argument}` };
  },
});

describe(`Integration test for portal ${portal}`, () => {
  describe("initPortalUrl", () => {
    it("Calling initPortalUrl after providing a custom portal URL should have no effect", async () => {
      const portalUrl1 = await client.portalUrl();
      expect(portalUrl1).toEqual(portal);

      await client.initPortalUrl();

      const portalUrl2 = await client.portalUrl();
      expect(portalUrl2).toEqual(portal);
    });
  });

  describe("File API integration tests", () => {
    const userID = "89e5147864297b80f5ddf29711ba8c093e724213b0dcbefbc3860cc6d598cc35";
    const path = "snew.hns/asdf";

    it("Should get existing File API JSON data", async () => {
      const expected = { name: "testnames" };

      const { data: received } = await client.file.getJSON(userID, path);
      expect(received).toEqual(expect.objectContaining(expected));
    });

    it("Should get existing File API entry data", async () => {
      const expected = new Uint8Array([
        65, 65, 67, 116, 77, 77, 114, 101, 122, 76, 56, 82, 71, 102, 105, 98, 104, 67, 53, 79, 98, 120, 48, 83, 102, 69,
        106, 48, 77, 87, 108, 106, 95, 112, 55, 97, 95, 77, 107, 90, 85, 81, 45, 77, 57, 65,
      ]);

      const { data: received } = await client.file.getEntryData(userID, path);
      expect(received).toEqualUint8Array(expected);
    });

    it("getEntryData should return null for non-existent File API entry data", async () => {
      const { publicKey: userID } = genKeyPairAndSeed();
      const { data: received } = await client.file.getEntryData(userID, path);
      expect(received).toBeNull();
    });

    it("Should get an existing entry link for a user ID and path", async () => {
      const expected = `${uriSkynetPrefix}AQAKDRJbfAOOp3Vk8L-cjuY2d34E8OrEOy_PTsD0xCkYOQ`;

      const entryLink = await client.file.getEntryLink(userID, path);
      expect(entryLink).toEqual(expected);
    });
  });

  describe("SkyDB end to end integration tests", () => {
    it("Should get existing SkyDB data", async () => {
      const publicKey = "89e5147864297b80f5ddf29711ba8c093e724213b0dcbefbc3860cc6d598cc35";
      const dataKey = "dataKey1";
      const expectedDataLink = `${uriSkynetPrefix}AACDPHoC2DCV_kLGUdpdRJr3CcxCmKadLGPi6OAMl7d48w`;
      const expectedData = { message: "hi there" };

      const { data: received, dataLink } = await client.db.getJSON(publicKey, dataKey);

      expect(expectedData).toEqual(received);
      expect(dataLink).toEqual(expectedDataLink);
    });

    it("Should get existing SkyDB data using entry link", async () => {
      const publicKey = "89e5147864297b80f5ddf29711ba8c093e724213b0dcbefbc3860cc6d598cc35";
      const dataKey = "dataKey3";
      const expectedJson = { message: "hi there!" };
      const expectedData = { _data: expectedJson };
      const expectedEntryLink = `${uriSkynetPrefix}AQAZ1R-KcL4NO_xIVf0q8B1ngPVd6ec-Pu54O0Cto387Nw`;
      const expectedDataLink = `${uriSkynetPrefix}AAAVyJktMuK-7WRCNUvYcYq7izvhCbgDLXlT4YgechblJw`;

      const entryLink = await client.registry.getEntryLink(publicKey, dataKey);
      expect(entryLink).toEqual(expectedEntryLink);

      const { data } = await client.getFileContent(entryLink);

      expect(data).toEqual(expect.objectContaining(expectedData));

      const { data: json, dataLink } = await client.db.getJSON(publicKey, dataKey);
      expect(dataLink).toEqual(expectedDataLink);
      expect(json).toEqual(expectedJson);
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

    it("Should be able to delete an existing entry", async () => {
      const { publicKey, privateKey } = genKeyPairAndSeed();
      const json = { data: "thisistext" };

      await client.db.setJSON(privateKey, dataKey, json);

      const { data, dataLink } = await client.db.getJSON(publicKey, dataKey);

      expect(data).toEqual(json);
      expect(dataLink).toBeTruthy();

      await client.db.deleteJSON(privateKey, dataKey);

      const { data: data2, dataLink: dataLink2 } = await client.db.getJSON(publicKey, dataKey);

      expect(data2).toBeNull();
      expect(dataLink2).toBeNull();
    });

    it("Should be able to set a new entry as deleted and then write over it", async () => {
      const { publicKey, privateKey } = genKeyPairAndSeed();

      await client.db.deleteJSON(privateKey, dataKey);

      // Get the entry link.
      const entryLink = await client.registry.getEntryLink(publicKey, dataKey);

      // Downloading the entry link should return a 404.
      // TODO: Should getFileContent return `null` on 404?
      try {
        await client.getFileContent(entryLink);
        throw new Error("getFileContent should not have succeeded");
      } catch (err) {
        expect(err.response.status).toEqual(404);
      }

      // The SkyDB entry should be null.
      const { data, dataLink } = await client.db.getJSON(publicKey, dataKey);

      expect(data).toBeNull();
      expect(dataLink).toBeNull();

      // Write to the entry.
      const json = { data: "thisistext" };
      await client.db.setJSON(privateKey, dataKey, json);

      // The entry should be readable.

      const { data: data2, dataLink: dataLink2 } = await client.db.getJSON(publicKey, dataKey);

      expect(data2).toEqual(json);
      expect(dataLink2).toBeTruthy();
    });

    it("Should correctly set a data link", async () => {
      const { publicKey, privateKey } = genKeyPairAndSeed();
      const dataLink = "AAAVyJktMuK-7WRCNUvYcYq7izvhCbgDLXlT4YgechblJw";
      const dataLinkBytes = decodeSkylinkBase64(dataLink);

      await client.db.setDataLink(privateKey, dataKey, dataLink);

      const { entry: returnedEntry } = await client.registry.getEntry(publicKey, dataKey);
      expect(returnedEntry).not.toBeNull();
      expect(returnedEntry).toEqual(expect.objectContaining({}));

      // @ts-expect-error TS still thinks returnedEntry can be null
      expect(returnedEntry.data).toEqualUint8Array(dataLinkBytes);
    });

    it("Should correctly handle the hashedDataKeyHex option", async () => {
      const { publicKey, privateKey } = genKeyPairAndSeed();
      const dataKey = "test";
      const hashedDataKeyHex = toHexString(hashDataKey(dataKey));
      const json = { message: "foo" };

      // Set JSON using the hashed data key hex.
      await client.db.setJSON(privateKey, hashedDataKeyHex, json, { hashedDataKeyHex: true });

      // Get JSON using the original data key.
      const { data } = await client.db.getJSON(publicKey, dataKey, { hashedDataKeyHex: false });

      expect(data).toEqual(json);
    });
  });

  describe("Registry end to end integration tests", () => {
    const data = stringToUint8ArrayUtf8("AABRKCTb6z9d-C-Hre-daX4-VIB8L7eydmEr8XRphnS8jg");

    it("Should return null for an inexistent entry", async () => {
      const { publicKey } = genKeyPairAndSeed();

      // Try getting an inexistent entry.
      const { entry, signature } = await client.registry.getEntry(publicKey, "foo");

      expect(entry).toBeNull();
      expect(signature).toBeNull();
    });

    it("Should set and get string entries correctly", async () => {
      const { publicKey, privateKey } = genKeyPairAndSeed();

      const entry = {
        dataKey,
        data,
        revision: BigInt(0),
      };

      await client.registry.setEntry(privateKey, entry);

      const { entry: returnedEntry } = await client.registry.getEntry(publicKey, dataKey);
      expect(returnedEntry).not.toBeNull();

      expect(returnedEntry).toEqual(entry);
    });

    it("Should set and get unicode entries correctly", async () => {
      const { publicKey, privateKey } = genKeyPairAndSeed();

      const entry = {
        dataKey,
        data: stringToUint8ArrayUtf8("∂"),
        revision: BigInt(0),
      };

      await client.registry.setEntry(privateKey, entry);

      const { entry: returnedEntry } = await client.registry.getEntry(publicKey, dataKey);
      expect(returnedEntry).not.toBeNull();

      expect(returnedEntry).toEqual(entry);
    });

    it("Should set and get an entry with empty data correctly", async () => {
      const { publicKey, privateKey } = genKeyPairAndSeed();

      const entry = {
        dataKey,
        data: new Uint8Array(),
        revision: BigInt(0),
      };

      await client.registry.setEntry(privateKey, entry);

      const { entry: returnedEntry } = await client.registry.getEntry(publicKey, dataKey);
      expect(returnedEntry).not.toBeNull();

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
  });

  describe("resolveHns", () => {
    it("Should resolve an HNS name with an underlying skyns link to a skylink", async () => {
      // Use an HNS we own that we don't plan on changing soon.
      const domain = "mayonnaise";
      const expectedEntryLink = `${uriSkynetPrefix}AQDwh1jnoZas9LaLHC_D4-2yP9XYDdZzNtz62H4Dww1jDA`;
      const dataKey = "43c8a9b01609544ab152dad397afc3b56c1518eb546750dbc6cad5944fec0292";
      const publicKey = "cbf97df45c9f166e893e164be714a4aee840d3a421f66e52f6b9e2a5009cfabc";
      const expectedData = {
        registry: {
          publickey: `ed25519:${publicKey}`,
          datakey: dataKey,
        },
      };

      const { data, skylink } = await client.resolveHns(domain);

      expect(skylink).toEqual(expectedEntryLink);
      expect(data).toEqual(expectedData);
    });
  });
});
