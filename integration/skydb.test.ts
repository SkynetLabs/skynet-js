import { client, dataKey, portal } from ".";
import {
  ExecuteRequestError,
  genKeyPairAndSeed,
  getEntryLink,
  JsonData,
  JSONResponse,
  SkynetClient,
  URI_SKYNET_PREFIX,
} from "../src";
import { hashDataKey } from "../src/crypto";
import { decodeSkylinkBase64 } from "../src/utils/encoding";
import { toHexString } from "../src/utils/string";

describe(`SkyDB end to end integration tests for portal '${portal}'`, () => {
  // Sleep for a second before each test to try to avoid rate limiter.
  beforeEach(async () => {
    await new Promise((r) => setTimeout(r, 1000));
  });

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
      throw new Error("'getFileContent' should not have succeeded");
    } catch (err) {
      // Assert the type and that instanceof behaves as expected.
      expect(err).toBeInstanceOf(ExecuteRequestError);
      expect((err as ExecuteRequestError).responseStatus).toEqual(404);
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

  it("Should update the revision number cache", async () => {
    const { publicKey, privateKey } = genKeyPairAndSeed();
    const json = { message: 1 };

    await client.db.setJSON(privateKey, dataKey, json);

    const cachedRevisionEntry = await client.db.revisionNumberCache.getRevisionAndMutexForEntry(publicKey, dataKey);
    expect(cachedRevisionEntry.revision.toString()).toEqual("0");

    await client.db.setJSON(privateKey, dataKey, json);

    expect(cachedRevisionEntry.revision.toString()).toEqual("1");

    await client.db.getJSON(publicKey, dataKey);

    expect(cachedRevisionEntry.revision.toString()).toEqual("1");
  });

  // REGRESSION TESTS: By creating a gap between setJSON and getJSON, a user
  // could call getJSON, get outdated data, then call setJSON, and overwrite
  // more up to date data with outdated data, but still use a high enough
  // revision number.
  //
  // The fix is that you cannot retrieve the revision number while calling
  // setJSON. You have to use the same revision number that you had when you
  // called getJSON.
  describe("getJSON/setJSON data race regression integration tests", () => {
    const jsonOld = { message: 1 };
    const jsonNew = { message: 2 };

    const delays = [0, 10, 100, 500];

    const concurrentAccessError = "Concurrent access prevented in SkyDB";
    const registryUpdateError = "Unable to update the registry";

    const getJSONWithDelay = async function (
      client: SkynetClient,
      delay: number,
      publicKey: string,
      dataKey: string
    ): Promise<JSONResponse> {
      await new Promise((r) => setTimeout(r, delay));
      return await client.db.getJSON(publicKey, dataKey);
    };
    const setJSONWithDelay = async function (
      client: SkynetClient,
      delay: number,
      privateKey: string,
      dataKey: string,
      data: JsonData
    ) {
      await new Promise((r) => setTimeout(r, delay));
      return await client.db.setJSON(privateKey, dataKey, data);
    };

    it.each(delays)(
      "should not get old data when getJSON is called after setJSON on a single client with a '%s' ms delay and getJSON doesn't fail",
      async (delay) => {
        const { publicKey, privateKey } = genKeyPairAndSeed();

        // Set the data.
        await client.db.setJSON(privateKey, dataKey, jsonOld);

        // Try to invoke the data race.
        let receivedJson;
        try {
          // Get the data while also calling setJSON.
          [{ data: receivedJson }] = await Promise.all([
            getJSONWithDelay(client, delay, publicKey, dataKey),
            setJSONWithDelay(client, 0, privateKey, dataKey, jsonNew),
          ]);
        } catch (e) {
          if ((e as Error).message.includes(concurrentAccessError)) {
            // The data race condition has been prevented and we received the
            // expected error. Return from test early.
            //
            // NOTE: I've manually confirmed that both code paths (no error, and
            // return on expected error) are hit.
            return;
          }

          // Unexpected error, throw.
          throw e;
        }

        // Data race did not occur, getJSON should have latest JSON.
        expect(receivedJson).toEqual(jsonNew);
      }
    );

    it.each(delays)(
      "should not be able to use old data when getJSON is called after setJSON on two different clients with a '%s' ms delay",
      async (delay) => {
        // Create two new clients with a fresh revision cache.
        const client1 = new SkynetClient(portal);
        const client2 = new SkynetClient(portal);
        const { publicKey, privateKey } = genKeyPairAndSeed();

        const cachedRevisionEntry1 = await client1.db.revisionNumberCache.getRevisionAndMutexForEntry(
          publicKey,
          dataKey
        );
        const cachedRevisionEntry2 = await client2.db.revisionNumberCache.getRevisionAndMutexForEntry(
          publicKey,
          dataKey
        );

        // Set the initial data.
        await client1.db.setJSON(privateKey, dataKey, jsonOld);
        expect(cachedRevisionEntry1.revision.toString()).toEqual("0");

        // Call getJSON and setJSON concurrently on different clients -- both
        // should succeeed.

        // Get the data while also calling setJSON.
        const [_, { data: receivedJson }] = await Promise.all([
          setJSONWithDelay(client1, 0, privateKey, dataKey, jsonNew),
          getJSONWithDelay(client2, delay, publicKey, dataKey),
        ]);

        // If we got old data from getJSON, make sure that that client is not
        // able to update that JSON.

        expect(receivedJson).not.toBeNull();
        expect(cachedRevisionEntry1.revision.toString()).toEqual("1");
        if (receivedJson?.message === jsonNew.message) {
          expect(cachedRevisionEntry2.revision.toString()).toEqual("1");
          // NOTE: I've manually confirmed that both code paths (no error, and
          // return on expected error) are hit.
          return;
        }
        expect(receivedJson).toEqual(jsonOld);
        expect(cachedRevisionEntry2.revision.toString()).toEqual("0");

        const updatedJson = { message: 3 };
        // Catches both "doesn't have enough pow" and "provided revision number
        // is already registered" errors.
        await expect(client2.db.setJSON(privateKey, dataKey, updatedJson)).rejects.toThrowError(registryUpdateError);

        // Should work on that client again after calling getJSON.

        const { data: receivedJson2 } = await client2.db.getJSON(publicKey, dataKey);
        expect(cachedRevisionEntry2.revision.toString()).toEqual("1");
        expect(receivedJson2).toEqual(jsonNew);

        const updatedJson2 = receivedJson2 as { message: number };
        updatedJson2.message++;
        await client2.db.setJSON(privateKey, dataKey, updatedJson2);
        expect(cachedRevisionEntry2.revision.toString()).toEqual("2");
      }
    );

    it.each(delays)(
      "should make sure that two concurrent setJSON calls on a single client with a '%s' ms delay either fail with the right error or succeed ",
      async (delay) => {
        const { publicKey, privateKey } = genKeyPairAndSeed();

        // Try to invoke two concurrent setJSON calls.
        try {
          await Promise.all([
            setJSONWithDelay(client, delay, privateKey, dataKey, jsonNew),
            setJSONWithDelay(client, 0, privateKey, dataKey, jsonOld),
          ]);
        } catch (e) {
          if ((e as Error).message.includes(concurrentAccessError)) {
            // The data race condition has been prevented and we received the
            // expected error. Return from test early.
            //
            // NOTE: I've manually confirmed that both code paths (no error, and
            // return on expected error) are hit.
            return;
          }

          // Unexpected error, throw.
          throw e;
        }

        // Data race did not occur, getJSON should get latest JSON.
        const { data: receivedJson } = await client.db.getJSON(publicKey, dataKey);
        expect(receivedJson).toEqual(jsonNew);
      }
    );

    it.each(delays)(
      "should make sure that two concurrent setJSON calls on different clients with a '%s' ms delay fail with the right error or succeed",
      async (delay) => {
        // Create two new clients with a fresh revision cache.
        const client1 = new SkynetClient(portal);
        const client2 = new SkynetClient(portal);
        const { publicKey, privateKey } = genKeyPairAndSeed();

        // Try to invoke two concurrent setJSON calls.
        try {
          await Promise.all([
            setJSONWithDelay(client2, delay, privateKey, dataKey, jsonNew),
            setJSONWithDelay(client1, 0, privateKey, dataKey, jsonOld),
          ]);
        } catch (e) {
          if ((e as Error).message.includes(registryUpdateError)) {
            // The data race condition has been prevented and we received the
            // expected error. Return from test early.
            //
            // NOTE: I've manually confirmed that both code paths (no error, and
            // return on expected error) are hit.
            return;
          }

          // Unexpected error, throw.
          throw e;
        }

        // Data race did not occur, getJSON should get one of the JSON values.
        let client3;
        if (Math.random() < 0.5) {
          client3 = client1;
        } else {
          client3 = client2;
        }
        const { data: receivedJson } = await client3.db.getJSON(publicKey, dataKey);
        expect([jsonOld, jsonNew]).toContainEqual(receivedJson);
      }
    );
  });
});
