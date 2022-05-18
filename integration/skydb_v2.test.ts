import { client, dataKey, portal } from ".";
import { ExecuteRequestError, genKeyPairAndSeed, getEntryLink, URI_SKYNET_PREFIX } from "../src";
import { hashDataKey } from "../src/crypto";
import { decodeSkylinkBase64 } from "../src/utils/encoding";
import { toHexString } from "../src/utils/string";

describe(`SkyDBV2 end to end integration tests for portal '${portal}'`, () => {
  it("Should get existing SkyDB data", async () => {
    const publicKey = "89e5147864297b80f5ddf29711ba8c093e724213b0dcbefbc3860cc6d598cc35";
    const dataKey = "dataKey1";
    const expectedDataLink = `${URI_SKYNET_PREFIX}AACDPHoC2DCV_kLGUdpdRJr3CcxCmKadLGPi6OAMl7d48w`;
    const expectedData = { message: "hi there" };

    const { data: received, dataLink } = await client.dbV2.getJSON(publicKey, dataKey);

    expect(expectedData).toEqual(received);
    expect(dataLink).toEqual(expectedDataLink);
  });

  it("Should get existing SkyDB data using entry link", async () => {
    const publicKey = "89e5147864297b80f5ddf29711ba8c093e724213b0dcbefbc3860cc6d598cc35";
    const dataKey = "dataKey3";
    const expectedJson = { message: "hi there!" };
    const expectedData = { _data: expectedJson };
    const expectedEntryLink = `${URI_SKYNET_PREFIX}AQAZ1R-KcL4NO_xIVf0q8B1ngPVd6ec-Pu54O0Cto387Nw`;
    const expectedDataLink = `${URI_SKYNET_PREFIX}AAAVyJktMuK-7WRCNUvYcYq7izvhCbgDLXlT4YgechblJw`;

    const entryLink = getEntryLink(publicKey, dataKey);
    expect(entryLink).toEqual(expectedEntryLink);

    const { data } = await client.getFileContent(entryLink);

    expect(data).toEqual(expect.objectContaining(expectedData));

    const { data: json, dataLink } = await client.dbV2.getJSON(publicKey, dataKey);
    expect(dataLink).toEqual(expectedDataLink);
    expect(json).toEqual(expectedJson);
  });

  it("getRawBytes should perform a lookup but not a skylink GET if the cachedDataLink is a hit for existing data", async () => {
    const publicKey = "89e5147864297b80f5ddf29711ba8c093e724213b0dcbefbc3860cc6d598cc35";
    const dataKey = "dataKey3";
    const expectedDataLink = `${URI_SKYNET_PREFIX}AAAVyJktMuK-7WRCNUvYcYq7izvhCbgDLXlT4YgechblJw`;

    const { data: returnedData, dataLink } = await client.dbV2.getRawBytes(publicKey, dataKey, {
      cachedDataLink: expectedDataLink,
    });
    expect(returnedData).toBeNull();
    expect(dataLink).toEqual(expectedDataLink);
  });

  it("Should get existing SkyDB data with unicode data key", async () => {
    const publicKey = "8346316de485703a0c7f58fdcfcb686354dedf58222b4b883b92fc786a3207bc";
    const dataKey = "dataKeyż";
    const expected = { message: "Hello" };

    const { data: received } = await client.dbV2.getJSON(publicKey, dataKey);

    expect(expected).toEqual(received);
  });

  it("Should return null for an inexistent entry", async () => {
    const { publicKey } = genKeyPairAndSeed();

    // Try getting an inexistent entry.
    const { data, dataLink } = await client.dbV2.getJSON(publicKey, "foo");
    expect(data).toBeNull();
    expect(dataLink).toBeNull();
  });

  it("Should set and get new entries", async () => {
    const { publicKey, privateKey } = genKeyPairAndSeed();
    const json = { data: "thisistext" };
    const json2 = { data: "foo2" };

    // Set the file in SkyDBV2.
    await client.dbV2.setJSON(privateKey, dataKey, json);

    // Get the file in SkyDBV2.
    const { data, dataLink } = await client.dbV2.getJSON(publicKey, dataKey);
    expect(data).toEqual(json);
    expect(dataLink).toBeTruthy();

    // Set the file again.
    await client.dbV2.setJSON(privateKey, dataKey, json2);

    // Get the file again, should have been updated.
    const { data: data2, dataLink: dataLink2 } = await client.dbV2.getJSON(publicKey, dataKey);
    expect(data2).toEqual(json2);
    expect(dataLink2).toBeTruthy();
  });

  // Regression test: Use some strange data keys that have failed in previous versions.
  const dataKeys = [".", "..", "http://localhost:8000/", ""];

  it.each(dataKeys)("Should set and get new entry with dataKey '%s'", async (dataKey) => {
    const { publicKey, privateKey } = genKeyPairAndSeed();
    const json = { data: "thisistext" };

    await client.dbV2.setJSON(privateKey, dataKey, json);

    const { data, dataLink } = await client.dbV2.getJSON(publicKey, dataKey);

    expect(data).toEqual(json);
    expect(dataLink).toBeTruthy();
  });

  it("Should be able to delete an existing entry", async () => {
    const { publicKey, privateKey } = genKeyPairAndSeed();
    const json = { data: "thisistext" };

    await client.dbV2.setJSON(privateKey, dataKey, json);

    const { data, dataLink } = await client.dbV2.getJSON(publicKey, dataKey);

    expect(data).toEqual(json);
    expect(dataLink).toBeTruthy();

    await client.dbV2.deleteJSON(privateKey, dataKey);

    const { data: data2, dataLink: dataLink2 } = await client.dbV2.getJSON(publicKey, dataKey);

    expect(data2).toBeNull();
    expect(dataLink2).toBeNull();
  });

  it("Should be able to set a new entry as deleted and then write over it", async () => {
    const { publicKey, privateKey } = genKeyPairAndSeed();

    await client.dbV2.deleteJSON(privateKey, dataKey);

    // Get the entry link.
    const entryLink = getEntryLink(publicKey, dataKey);

    // Downloading the entry link should return a 404.
    // TODO: Should getFileContent return `null` on 404?
    try {
      await client.getFileContent(entryLink);
      throw new Error("'getFileContent' should not have succeeded");
    } catch (err) {
      // Assert the type and that instanceof behaves as expected.
      expect(err).toBeInstanceOf(ExecuteRequestError);
      expect((err as ExecuteRequestError).responseStatus).toEqual(404);
    }

    // The SkyDB entry should be null.
    const { data, dataLink } = await client.dbV2.getJSON(publicKey, dataKey);

    expect(data).toBeNull();
    expect(dataLink).toBeNull();

    // Write to the entry.
    const json = { data: "thisistext" };
    await client.dbV2.setJSON(privateKey, dataKey, json);

    // The entry should be readable.

    const { data: data2, dataLink: dataLink2 } = await client.dbV2.getJSON(publicKey, dataKey);

    expect(data2).toEqual(json);
    expect(dataLink2).toBeTruthy();
  });

  it("Should correctly set a data link", async () => {
    const { publicKey, privateKey } = genKeyPairAndSeed();
    const dataLink = "AAAVyJktMuK-7WRCNUvYcYq7izvhCbgDLXlT4YgechblJw";
    const dataLinkBytes = decodeSkylinkBase64(dataLink);

    await client.dbV2.setDataLink(privateKey, dataKey, dataLink);

    const { entry: returnedEntry } = await client.registry.getEntry(publicKey, dataKey);
    expect(returnedEntry).not.toBeNull();
    expect(returnedEntry).toEqual(expect.objectContaining({}));

    // @ts-expect-error TS still thinks returnedEntry can be null
    expect(returnedEntry.data).toEqualUint8Array(dataLinkBytes);
  });

  it("should set and get entry data", async () => {
    const { publicKey, privateKey } = genKeyPairAndSeed();
    const data = new Uint8Array([1, 2, 3]);

    // Set the entry data.
    await client.dbV2.setEntryData(privateKey, dataKey, data);

    // Get the entry data.
    const { data: returnedData } = await client.dbV2.getEntryData(publicKey, dataKey);

    // Assert the returned data equals the original data.
    expect(returnedData).toEqualUint8Array(data);
  });

  it("should set and delete entry data", async () => {
    const { publicKey, privateKey } = genKeyPairAndSeed();
    const data = new Uint8Array([1, 2, 3]);

    // Set the entry data.
    await client.dbV2.setEntryData(privateKey, dataKey, data);

    // Delete the entry data.
    await client.dbV2.deleteEntryData(privateKey, dataKey);

    // Trying to get the deleted data should result in null.
    const { data: returnedData } = await client.dbV2.getEntryData(publicKey, dataKey);
    expect(returnedData).toBeNull();
  });

  it("should be able to delete a new entry and then write over it", async () => {
    const data = new Uint8Array([1, 2, 3]);

    const { publicKey, privateKey } = genKeyPairAndSeed();

    // Delete the entry data.
    await client.dbV2.deleteEntryData(privateKey, dataKey);

    // Trying to fetch the entry should result in null.
    const { data: returnedData } = await client.dbV2.getEntryData(publicKey, dataKey);
    expect(returnedData).toBeNull();

    // Write to the entry.
    await client.dbV2.setEntryData(privateKey, dataKey, data);

    // The entry should be readable.

    const { data: returnedData2 } = await client.dbV2.getEntryData(publicKey, dataKey);

    expect(returnedData2).toEqual(data);
  });

  it("Should correctly handle the hashedDataKeyHex option", async () => {
    const { publicKey, privateKey } = genKeyPairAndSeed();
    const dataKey = "test";
    const hashedDataKeyHex = toHexString(hashDataKey(dataKey));
    const json = { message: "foo" };

    // Set JSON using the hashed data key hex.
    await client.dbV2.setJSON(privateKey, hashedDataKeyHex, json, { hashedDataKeyHex: true });

    // Get JSON using the original data key.
    const { data } = await client.dbV2.getJSON(publicKey, dataKey, { hashedDataKeyHex: false });

    expect(data).toEqual(json);
  });

  it("Should update the revision number cache", async () => {
    const { publicKey, privateKey } = genKeyPairAndSeed();
    const json = { message: 1 };

    await client.dbV2.setJSON(privateKey, dataKey, json);

    const cachedRevisionEntry = await client.dbV2.revisionNumberCache.getRevisionAndMutexForEntry(publicKey, dataKey);
    expect(cachedRevisionEntry.revision.toString()).toEqual("0");

    await client.dbV2.setJSON(privateKey, dataKey, json);

    expect(cachedRevisionEntry.revision.toString()).toEqual("1");

    await client.dbV2.getJSON(publicKey, dataKey);

    expect(cachedRevisionEntry.revision.toString()).toEqual("1");
  });
});
