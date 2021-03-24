import { genKeyPairAndSeed, SkynetClient } from "./index";
import { MAX_GET_ENTRY_TIMEOUT } from "./registry";
import { MAX_REVISION } from "./utils";

// To test a specific server, e.g. SKYNET_JS_INTEGRATION_TEST_SERVER=https://eu-fin-1.siasky.net yarn test src/integration.test.ts
const portal = process.env.SKYNET_JS_INTEGRATION_TEST_SERVER || "https://siasky.net";
const client = new SkynetClient(portal);

const dataKey = "HelloWorld";

describe(`Integration test for portal ${portal}`, () => {
  describe("SkyDB end to end integration tests", () => {
    it("Should return null for an inexistent entry", async () => {
      const { publicKey } = genKeyPairAndSeed();

      // Try getting an inexistent entry.
      const { data, revision } = await client.db.getJSON(publicKey, "foo");
      expect(data).toBeNull();
      expect(revision).toBeNull();
    });

    it("Should set and get new entries", async () => {
      const { publicKey, privateKey } = genKeyPairAndSeed();
      const json = { data: "thisistext" };

      // Set the file in the SkyDB.
      await client.db.setJSON(privateKey, dataKey, json);

      // get the file in the SkyDB
      const { data, revision } = await client.db.getJSON(publicKey, dataKey);
      expect(data).toEqual(json);
      // Revision should be 0.
      expect(revision).toEqual(BigInt(0));
    });

    it("Should set and get entries with the revision at the max allowed", async () => {
      const { publicKey, privateKey } = genKeyPairAndSeed();
      const json = { data: "testnumber2" };

      await client.db.setJSON(privateKey, dataKey, json, MAX_REVISION);

      const actual = await client.db.getJSON(publicKey, dataKey);
      expect(actual.data).toEqual(json);
      expect(actual.revision).toEqual(MAX_REVISION);
    });

    it("Try setting the revision higher than the uint64 max", async () => {
      const { privateKey } = genKeyPairAndSeed();
      const json = { data: "testnumber3" };
      const largeint = MAX_REVISION + BigInt(1);

      await expect(client.db.setJSON(privateKey, dataKey, json, largeint)).rejects.toThrowError(
        "Argument 18446744073709551616 does not fit in a 64-bit unsigned integer; exceeds 2^64-1"
      );
    });
  });

  describe("Registry end to end integration tests", () => {
    it("Should return null for an inexistent entry", async () => {
      const { publicKey } = genKeyPairAndSeed();

      // Try getting an inexistant entry.
      const { entry, signature } = await client.registry.getEntry(publicKey, "foo");

      expect(entry).toBeNull();
      expect(signature).toBeNull();
    });

    it("Should set and get entries correctly", async () => {
      const { publicKey, privateKey } = genKeyPairAndSeed();

      const entry = {
        datakey: dataKey,
        data: "foo",
        revision: BigInt(0),
      };

      await client.registry.setEntry(privateKey, entry);

      const { entry: returnedEntry } = await client.registry.getEntry(publicKey, dataKey);

      expect(returnedEntry).toEqual(entry);
    });

    it("Should set and get an entry with empty data correctly", async () => {
      const { publicKey, privateKey } = genKeyPairAndSeed();

      const entry = {
        datakey: dataKey,
        data: "",
        revision: BigInt(0),
      };

      await client.registry.setEntry(privateKey, entry);

      const { entry: returnedEntry } = await client.registry.getEntry(publicKey, dataKey);

      expect(returnedEntry).toEqual(entry);
    });

    it("setEntry should not be affected by timeout parameter", async () => {
      const { publicKey, privateKey } = genKeyPairAndSeed();

      const entry = {
        datakey: dataKey,
        data: "bar",
        revision: BigInt(0),
      };

      // Use a timeout of 0 (invalid, but should be ignored).
      // @ts-expect-error We pass an invalid parameter on purpose.
      await client.registry.setEntry(privateKey, entry, { timeout: 0 });
      const { entry: returnedEntry } = await client.registry.getEntry(publicKey, dataKey);
      expect(returnedEntry).toEqual(entry);

      entry.revision = BigInt(1);

      // Use a timeout of 301 (invalid, but should be ignored).
      // @ts-expect-error We pass an invalid parameter on purpose.
      await client.registry.setEntry(privateKey, entry, { timeout: MAX_GET_ENTRY_TIMEOUT + 1 });
      const { entry: returnedEntry2 } = await client.registry.getEntry(publicKey, dataKey);
      expect(returnedEntry2).toEqual(entry);
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

    it("Should get plaintext file contents", async () => {
      // Upload the data to acquire its skylink.
      const file = new File([fileData], dataKey, { type: plaintextType });
      const { skylink } = await client.uploadFile(file);
      expect(skylink).not.toEqual("");

      // Get file content and check returned values.

      const { data, contentType, metadata, portalUrl, skylink: returnedSkylink } = await client.getFileContent(skylink);
      expect(data).toEqual(expect.any(String));
      expect(data).toEqual(data);
      expect(contentType).toEqual("text/plain");
      expect(metadata).toEqual(plaintextMetadata);
      expect(portalUrl).toEqual(portal);
      expect(skylink).toEqual(returnedSkylink);
    });

    it("Should get plaintext file metadata", async () => {
      // Upload the data to acquire its skylink.

      const file = new File([fileData], dataKey, { type: plaintextType });
      const { skylink } = await client.uploadFile(file);
      expect(skylink).not.toEqual("");

      // Get file metadata and check returned values.

      const { contentType, metadata, portalUrl, skylink: returnedSkylink } = await client.getMetadata(skylink);

      expect(contentType).toEqual("text/plain");
      expect(metadata).toEqual(plaintextMetadata);
      expect(portalUrl).toEqual(portal);
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
});
