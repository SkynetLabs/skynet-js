import { AxiosError } from "axios";

import { client, dataKey, portal } from ".";
import { genKeyPairAndSeed, getEntryLink, URI_SKYNET_PREFIX } from "../src";
import { hashDataKey } from "../src/crypto";
import { decodeSkylinkBase64 } from "../src/utils/encoding";
import { toHexString } from "../src/utils/string";

describe(`SkyDB end to end integration tests for portal '${portal}'`, () => {
  it("Should get existing SkyDB data", async () => {
    const publicKey = "89e5147864297b80f5ddf29711ba8c093e724213b0dcbefbc3860cc6d598cc35";
    const dataKey = "dataKey1";
    const expectedDataLink = `${URI_SKYNET_PREFIX}AACDPHoC2DCV_kLGUdpdRJr3CcxCmKadLGPi6OAMl7d48w`;
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
    const expectedEntryLink = `${URI_SKYNET_PREFIX}AQAZ1R-KcL4NO_xIVf0q8B1ngPVd6ec-Pu54O0Cto387Nw`;
    const expectedDataLink = `${URI_SKYNET_PREFIX}AAAVyJktMuK-7WRCNUvYcYq7izvhCbgDLXlT4YgechblJw`;

    const entryLink = getEntryLink(publicKey, dataKey);
    expect(entryLink).toEqual(expectedEntryLink);

    const { data } = await client.getFileContent(entryLink);

    expect(data).toEqual(expect.objectContaining(expectedData));

    const { data: json, dataLink } = await client.db.getJSON(publicKey, dataKey);
    expect(dataLink).toEqual(expectedDataLink);
    expect(json).toEqual(expectedJson);
  });

  it("getRawBytes should perform a lookup but not a skylink GET if the cachedDataLink is a hit for existing data", async () => {
    const publicKey = "89e5147864297b80f5ddf29711ba8c093e724213b0dcbefbc3860cc6d598cc35";
    const dataKey = "dataKey3";
    const expectedDataLink = `${URI_SKYNET_PREFIX}AAAVyJktMuK-7WRCNUvYcYq7izvhCbgDLXlT4YgechblJw`;

    const { data: returnedData, dataLink } = await client.db.getRawBytes(publicKey, dataKey, {
      cachedDataLink: expectedDataLink,
    });
    expect(returnedData).toBeNull();
    expect(dataLink).toEqual(expectedDataLink);
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
    const entryLink = getEntryLink(publicKey, dataKey);

    // Downloading the entry link should return a 404.
    // TODO: Should getFileContent return `null` on 404?
    try {
      await client.getFileContent(entryLink);
      throw new Error("getFileContent should not have succeeded");
    } catch (err) {
      expect((err as AxiosError).response?.status).toEqual(404);
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

  it("should set and get entry data", async () => {
    const { publicKey, privateKey } = genKeyPairAndSeed();
    const data = new Uint8Array([1, 2, 3]);

    // Set the entry data.
    await client.db.setEntryData(privateKey, dataKey, data);

    // Get the entry data.
    const { data: returnedData } = await client.db.getEntryData(publicKey, dataKey);

    // Assert the returned data equals the original data.
    expect(returnedData).toEqualUint8Array(data);
  });

  it("should set and delete entry data", async () => {
    const { publicKey, privateKey } = genKeyPairAndSeed();
    const data = new Uint8Array([1, 2, 3]);

    // Set the entry data.
    await client.db.setEntryData(privateKey, dataKey, data);

    // Delete the entry data.
    await client.db.deleteEntryData(privateKey, dataKey);

    // Trying to get the deleted data should result in null.
    const { data: returnedData } = await client.db.getEntryData(publicKey, dataKey);
    expect(returnedData).toBeNull();
  });

  it("should be able to delete a new entry and then write over it", async () => {
    const data = new Uint8Array([1, 2, 3]);

    const { publicKey, privateKey } = genKeyPairAndSeed();

    // Delete the entry data.
    await client.db.deleteEntryData(privateKey, dataKey);

    // Trying to fetch the entry should result in null.
    const { data: returnedData } = await client.db.getEntryData(publicKey, dataKey);
    expect(returnedData).toBeNull();

    // Write to the entry.
    await client.db.setEntryData(privateKey, dataKey, data);

    // The entry should be readable.

    const { data: returnedData2 } = await client.db.getEntryData(publicKey, dataKey);

    expect(returnedData2).toEqual(data);
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

  // REGRESSION TEST: By creating a gap between setJSON and getJSON, a user
  // could call getJSON, get outdated data, then call setJSON, and overwrite
  // more up to date data with outdated data, but still use a high enough
  // revision number.
  //
  // The fix is that you cannot retrieve the revision number while calling
  // setJSON. You have to use the same revision number that you had when you
  // called getJSON
  it("Should avoid data race bugs where getJSON is not called", async () => {
    const { publicKey, privateKey } = genKeyPairAndSeed();
    const json1 = { message: 1 };
    const json2 = { message: 2 };

    // Set the data.
    await client.db.setJSON(privateKey, dataKey, json1);

    // Try to invoke the data race.
    let receivedJson;
    try {
      // Get the data while also calling setJSON.
      [{ data: receivedJson }] = await Promise.all([
        client.db.getJSON(publicKey, dataKey),
        client.db.setJSON(privateKey, dataKey, json2),
      ]);
    } catch (e) {
      if ((e as Error).message.includes("A higher revision number for this userID and path is already cached")) {
        // The data race condition has been prevented and we received the expected error. Return from test early.
        return;
      }

      // Unexpected error, throw.
      throw e;
    }

    // Data race did not occur, getJSON should have latest JSON.
    expect(receivedJson).toEqual(json2);
  });
});
