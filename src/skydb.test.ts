import axios from "axios";
import MockAdapter from "axios-mock-adapter";

import { getSkylinkUrlForPortal } from "./download";
import { MAX_REVISION } from "./utils/number";
import { stringToUint8ArrayUtf8, toHexString } from "./utils/string";
import { DEFAULT_SKYNET_PORTAL_URL, URI_SKYNET_PREFIX } from "./utils/url";
import { SkynetClient } from "./index";
import { getEntryUrlForPortal } from "./registry";
import { checkCachedDataLink, DELETION_ENTRY_DATA, JSONResponse } from "./skydb";
import { MAX_ENTRY_LENGTH } from "./mysky";

// Generated with genKeyPairFromSeed("insecure test seed")
const [publicKey, privateKey] = [
  "658b900df55e983ce85f3f9fb2a088d568ab514e7bbda51cfbfb16ea945378d9",
  "7caffac49ac914a541b28723f11776d36ce81e7b9b0c96ccacd1302db429c79c658b900df55e983ce85f3f9fb2a088d568ab514e7bbda51cfbfb16ea945378d9",
];
const dataKey = "app";
const skylink = "CABAB_1Dt0FJsxqsu_J4TodNCbCGvtFf1Uys_3EgzOlTcg";
const sialink = `${URI_SKYNET_PREFIX}${skylink}`;
const jsonData = { data: "thisistext" };
const fullJsonData = { _data: jsonData, _v: 2 };
const legacyJsonData = jsonData;
const merkleroot = "QAf9Q7dBSbMarLvyeE6HTQmwhr7RX9VMrP9xIMzpU3I";
const bitfield = 2048;

const portalUrl = DEFAULT_SKYNET_PORTAL_URL;
const client = new SkynetClient(portalUrl);
const registryPostUrl = `${portalUrl}/skynet/registry`;
const registryGetUrl = getEntryUrlForPortal(portalUrl, publicKey, dataKey);
const uploadUrl = `${portalUrl}/skynet/skyfile`;
const skylinkUrl = getSkylinkUrlForPortal(portalUrl, skylink);

// Hex-encoded skylink.
const data = "43414241425f31447430464a73787173755f4a34546f644e4362434776744666315579735f3345677a4f6c546367";
const revision = 11;
// Entry data for the data and revision.
const entryData = {
  data,
  revision,
  signature:
    "33d14d2889cb292142614da0e0ff13a205c4867961276001471d13b779fc9032568ddd292d9e0dff69d7b1f28be07972cc9d86da3cecf3adecb6f9b7311af809",
};

const headers = {
  "skynet-portal-api": portalUrl,
  "skynet-skylink": skylink,
  "content-type": "application/json",
};

describe("getJSON", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    mock.onHead(portalUrl).replyOnce(200, {}, { "skynet-portal-api": portalUrl });
    mock.resetHistory();
  });

  it("should perform a lookup and skylink GET", async () => {
    // mock a successful registry lookup
    mock.onGet(registryGetUrl).replyOnce(200, JSON.stringify(entryData));
    // mock a successful data download
    mock.onGet(skylinkUrl).replyOnce(200, fullJsonData, headers);

    const { data, dataLink } = await client.db.getJSON(publicKey, dataKey);
    expect(data).toEqual(jsonData);
    expect(dataLink).toEqual(sialink);
    expect(mock.history.get.length).toBe(2);
  });

  it("should perform a lookup but not a skylink GET if the cachedDataLink is a hit", async () => {
    // mock a successful registry lookup
    mock.onGet(registryGetUrl).replyOnce(200, JSON.stringify(entryData));

    const { data, dataLink } = await client.db.getJSON(publicKey, dataKey, { cachedDataLink: skylink });
    expect(data).toBeNull();
    expect(dataLink).toEqual(sialink);
    expect(mock.history.get.length).toBe(1);
  });

  it("should perform a lookup and a skylink GET if the cachedDataLink is not a hit", async () => {
    const skylinkNoHit = "XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg";

    // mock a successful registry lookup
    mock.onGet(registryGetUrl).replyOnce(200, JSON.stringify(entryData));
    mock.onGet(skylinkUrl).replyOnce(200, fullJsonData, headers);

    const { data, dataLink } = await client.db.getJSON(publicKey, dataKey, { cachedDataLink: skylinkNoHit });
    expect(data).toEqual(jsonData);
    expect(dataLink).toEqual(sialink);
    expect(mock.history.get.length).toBe(2);
  });

  it("should throw if the cachedDataLink is not a valid skylink", async () => {
    // mock a successful registry lookup
    mock.onGet(registryGetUrl).replyOnce(200, JSON.stringify(entryData));
    mock.onGet(skylinkUrl).replyOnce(200, fullJsonData, {});

    await expect(client.db.getJSON(publicKey, dataKey, { cachedDataLink: "asdf" })).rejects.toThrowError(
      "Expected optional parameter 'cachedDataLink' to be valid skylink of type 'string', was type 'string', value 'asdf'"
    );
  });

  it("should perform a lookup and skylink GET on legacy pre-v4 data", async () => {
    // mock a successful registry lookup
    mock.onGet(registryGetUrl).replyOnce(200, JSON.stringify(entryData));
    mock.onGet(skylinkUrl).replyOnce(200, legacyJsonData, headers);

    const jsonReturned = await client.db.getJSON(publicKey, dataKey);
    expect(jsonReturned.data).toEqual(jsonData);
    expect(mock.history.get.length).toBe(2);
  });

  it("should return null if no entry is found", async () => {
    mock.onGet(registryGetUrl).replyOnce(404);

    const { data, dataLink } = await client.db.getJSON(publicKey, dataKey);
    expect(data).toBeNull();
    expect(dataLink).toBeNull();
  });

  it("should throw if the returned file data is not JSON", async () => {
    // mock a successful registry lookup
    mock.onGet(registryGetUrl).replyOnce(200, JSON.stringify(entryData));
    mock.onGet(skylinkUrl).replyOnce(200, "thisistext", { ...headers, "content-type": "text/plain" });

    await expect(client.db.getJSON(publicKey, dataKey)).rejects.toThrowError(
      `File data for the entry at data key '${dataKey}' is not JSON.`
    );
  });

  it("should throw if the returned _data field in the file data is not JSON", async () => {
    // mock a successful registry lookup
    mock.onGet(registryGetUrl).replyOnce(200, JSON.stringify(entryData));
    mock.onGet(skylinkUrl).replyOnce(200, { _data: "thisistext", _v: 1 }, headers);

    await expect(client.db.getJSON(publicKey, dataKey)).rejects.toThrowError(
      "File data '_data' for the entry at data key 'app' is not JSON."
    );
  });

  it("should throw if invalid entry data is returned", async () => {
    const client = new SkynetClient(portalUrl);
    const mockedFn = jest.fn();
    mockedFn.mockReturnValueOnce({ entry: { data: new Uint8Array() } });
    client.registry.getEntry = mockedFn;
    await expect(client.db.getJSON(publicKey, dataKey)).rejects.toThrowError(
      "Expected returned entry data 'entry.data' to be length 34 bytes, was type 'object', value ''"
    );
  });
});

describe("setJSON", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    mock.onHead(portalUrl).replyOnce(200, {}, { "skynet-portal-api": portalUrl });
    mock.resetHistory();
    // mock a successful upload
    mock.onPost(uploadUrl).reply(200, { skylink, merkleroot, bitfield });
  });

  it("should perform an upload, lookup and registry update", async () => {
    // mock a successful registry update
    mock.onPost(registryPostUrl).replyOnce(204);

    // set data
    const { data: returnedData, dataLink: returnedSkylink } = await client.db.setJSON(privateKey, dataKey, jsonData);
    expect(returnedData).toEqual(jsonData);
    expect(returnedSkylink).toEqual(sialink);

    // assert our request history contains the expected amount of requests
    expect(mock.history.get.length).toBe(0);
    expect(mock.history.post.length).toBe(2);

    const data = JSON.parse(mock.history.post[1].data);
    expect(data).toBeDefined();
    expect(data.revision).toBeGreaterThanOrEqual(revision + 1);
  });

  it("should use a revision number of 0 if the entry is not cached", async () => {
    // mock a successful registry update
    mock.onPost(registryPostUrl).replyOnce(204);

    // call `setJSON` on the client
    await client.db.setJSON(privateKey, "inexistent entry", jsonData);

    // assert our request history contains the expected amount of requests
    expect(mock.history.get.length).toBe(0);
    expect(mock.history.post.length).toBe(2);

    const data = JSON.parse(mock.history.post[1].data);
    expect(data).toBeDefined();
    expect(data.revision).toEqual(0);
  });

  it("should fail if the entry has the maximum allowed revision", async () => {
    const dataKey = "maximum revision";
    const cachedRevisionEntry = await client.revisionNumberCache.getRevisionAndMutexForEntry(publicKey, dataKey);
    cachedRevisionEntry.revision = MAX_REVISION;

    // mock a successful registry update
    mock.onPost(registryPostUrl).replyOnce(204);

    // Try to set data, should fail.
    await expect(client.db.setJSON(privateKey, dataKey, entryData)).rejects.toThrowError(
      "Current entry already has maximum allowed revision, could not update the entry"
    );
  });

  it("Should throw an error if the private key is not hex-encoded", async () => {
    await expect(client.db.setJSON("foo", dataKey, {})).rejects.toThrowError(
      "Expected parameter 'privateKey' to be a hex-encoded string, was type 'string', value 'foo'"
    );
  });

  it("Should throw an error if the data key is not provided", async () => {
    // @ts-expect-error We do not pass the data key on purpose.
    await expect(client.db.setJSON(privateKey)).rejects.toThrowError(
      "Expected parameter 'dataKey' to be type 'string', was type 'undefined'"
    );
  });

  it("Should throw an error if the json is not provided", async () => {
    // @ts-expect-error We do not pass the json on purpose.
    await expect(client.db.setJSON(privateKey, dataKey)).rejects.toThrowError(
      "Expected parameter 'json' to be type 'object', was type 'undefined'"
    );
  });

  it("Should not update the cached revision if the registry update fails.", async () => {
    const dataKey = "registry failure";
    const json = { foo: "bar" };

    // mock a successful registry update
    mock.onPost(registryPostUrl).replyOnce(204);

    await client.db.setJSON(privateKey, dataKey, json);

    const cachedRevisionEntry = await client.revisionNumberCache.getRevisionAndMutexForEntry(publicKey, dataKey);
    const revision1 = cachedRevisionEntry.revision;

    // mock a failed registry update
    mock.onPost(registryPostUrl).replyOnce(400, JSON.stringify({ message: "foo" }));

    await expect(client.db.setJSON(privateKey, dataKey, json)).rejects.toEqual(new Error("foo"));

    const revision2 = cachedRevisionEntry.revision;

    expect(revision1.toString()).toEqual(revision2.toString());
  });
});

describe("setEntryData", () => {
  it("should throw if trying to set entry data > 70 bytes", async () => {
    await expect(
      client.db.setEntryData(privateKey, dataKey, new Uint8Array(MAX_ENTRY_LENGTH + 1))
    ).rejects.toThrowError(
      "Expected parameter 'data' to be 'Uint8Array' of length <= 70, was length 71, was type 'object', value '0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0'"
    );
  });

  it("should throw if trying to set the deletion entry data", async () => {
    await expect(client.db.setEntryData(privateKey, dataKey, DELETION_ENTRY_DATA)).rejects.toThrowError(
      "Tried to set 'Uint8Array' entry data that is the deletion sentinel ('Uint8Array(RAW_SKYLINK_SIZE)'), please use the 'deleteEntryData' method instead`"
    );
  });
});

describe("checkCachedDataLink", () => {
  const differentSkylink = "XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg";
  const inputs: Array<[string, string | undefined, boolean]> = [
    [skylink, undefined, false],
    [skylink, skylink, true],
    [skylink, differentSkylink, false],
    [differentSkylink, skylink, false],
  ];

  it.each(inputs)("checkCachedDataLink(%s, %s) should return %s", (rawDataLink, cachedDataLink, output) => {
    expect(checkCachedDataLink(rawDataLink, cachedDataLink)).toEqual(output);
  });

  it("Should throw on invalid cachedDataLink", () => {
    expect(() => checkCachedDataLink(skylink, "asdf")).toThrowError(
      "Expected optional parameter 'cachedDataLink' to be valid skylink of type 'string', was type 'string', value 'asdf'"
    );
  });
});

// REGRESSION TESTS: By creating a gap between setJSON and getJSON, a user
// could call getJSON, get outdated data, then call setJSON, and overwrite
// more up to date data with outdated data, but still use a high enough
// revision number.
//
// The fix is that you cannot retrieve the revision number while calling
// setJSON. You have to use the same revision number that you had when you
// called getJSON.
describe("getJSON/setJSON data race regression unit tests", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    // Add a delay to responses to simulate actual calls that use the network.
    mock = new MockAdapter(axios, { delayResponse: 100 });
    mock.reset();
    mock.onHead(portalUrl).replyOnce(200, {}, { "skynet-portal-api": portalUrl });
  });

  const skylinkOld = "XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg";
  const skylinkOldUrl = getSkylinkUrlForPortal(portalUrl, skylinkOld);
  const dataOld = toHexString(stringToUint8ArrayUtf8(skylinkOld)); // hex-encoded skylink
  const revisionOld = 0;
  const entryDataOld = {
    data: dataOld,
    revision: revisionOld,
    signature:
      "921d30e860d51f13d1065ea221b29fc8d11cfe7fa0e32b5d5b8e13bee6f91cfa86fe6b12ca4cef7a90ba52d2c50efb62b241f383e9d7bb264558280e564faa0f",
  };
  const headersOld = { ...headers, "skynet-skylink": skylinkOld };

  const skylinkNew = skylink;
  const skylinkNewUrl = skylinkUrl;
  const dataNew = data; // hex-encoded skylink
  const revisionNew = 1;
  const entryDataNew = {
    data: dataNew,
    revision: revisionNew,
    signature:
      "2a9889915f06d414e8cde51eb17db565410d20b2b50214e8297f7f4a0cb5c77e0edc62a319607dfaa042e0cc16ed0d7e549cca2abd11c2f86a335009936f150d",
  };
  const headersNew = { ...headers, "skynet-skylink": skylinkNew };

  const jsonOld = { message: 1 };
  const jsonNew = { message: 2 };
  const skynetJsonOld = { _data: jsonOld, _v: 2 };
  const skynetJsonNew = { _data: jsonNew, _v: 2 };

  const concurrentAccessError = "Concurrent access prevented in SkyDB";
  const higherRevisionError = "A higher revision number for this userID and path is already cached";

  it("should not get old data when getJSON and setJSON are called simultaneously on the same client and getJSON doesn't fail", async () => {
    // Create a new client with a fresh revision cache.
    const client = new SkynetClient(portalUrl);

    // Mock setJSON with the old skylink.
    mock.onPost(uploadUrl).replyOnce(200, { skylink: skylinkOld, merkleroot, bitfield });
    mock.onPost(registryPostUrl).replyOnce(204);

    // Set the data.
    await client.db.setJSON(privateKey, dataKey, jsonOld);

    // Mock getJSON with the new entry data and the new skylink.
    mock.onGet(registryGetUrl).replyOnce(200, JSON.stringify(entryDataNew));
    mock.onGet(skylinkNewUrl).replyOnce(200, skynetJsonNew, headers);

    // Mock setJSON with the new skylink.
    mock.onPost(uploadUrl).replyOnce(200, { skylink: skylinkNew, merkleroot, bitfield });
    mock.onPost(registryPostUrl).replyOnce(204);

    // Try to invoke the data race.
    // Get the data while also calling setJSON.
    // Use Promise.allSettled to wait for all promises to finish, or some mocked requests will hang around and interfere with the later tests.
    const values = await Promise.allSettled([
      client.db.getJSON(publicKey, dataKey),
      client.db.setJSON(privateKey, dataKey, jsonNew),
    ]);

    // If any promises were rejected, check the error message.
    const data = checkSettledValuesForErrorOrValue<JSONResponse>(values, concurrentAccessError);
    if (!data) {
      // The data race condition was avoided and we received the expected
      // error. Return from test early.
      return;
    }

    // Data race did not occur, getJSON should have latest JSON.
    expect(data.data).toEqual(jsonNew);

    // assert our request history contains the expected amount of requests
    expect(mock.history.get.length).toBe(2);
    expect(mock.history.post.length).toBe(4);
  });

  it("should not get old data when getJSON and setJSON are called simultaneously on different clients and getJSON doesn't fail", async () => {
    // Create two new clients with a fresh revision cache.
    const client1 = new SkynetClient(portalUrl);
    const client2 = new SkynetClient(portalUrl);

    // Mock setJSON with the old skylink.
    mock.onPost(uploadUrl).replyOnce(200, { skylink: skylinkOld, merkleroot, bitfield });
    mock.onPost(registryPostUrl).replyOnce(204);

    // Set the data.
    await client1.db.setJSON(privateKey, dataKey, jsonOld);

    // Mock getJSON with the new entry data and the new skylink.
    mock.onGet(registryGetUrl).replyOnce(200, JSON.stringify(entryDataNew));
    mock.onGet(skylinkNewUrl).replyOnce(200, skynetJsonNew, headersNew);

    // Mock setJSON with the new skylink.
    mock.onPost(uploadUrl).replyOnce(200, { skylink: skylinkNew, merkleroot, bitfield });
    mock.onPost(registryPostUrl).replyOnce(204);

    // Try to invoke the data race.
    // Get the data while also calling setJSON.
    // Use Promise.allSettled to wait for all promises to finish, or some mocked requests will hang around and interfere with the later tests.
    const values = await Promise.allSettled([
      client1.db.getJSON(publicKey, dataKey),
      client2.db.setJSON(privateKey, dataKey, jsonNew),
    ]);

    // If any promises were rejected, check the error message.
    const data = checkSettledValuesForErrorOrValue<JSONResponse>(values, higherRevisionError);
    if (!data) {
      // The data race condition was avoided and we received the expected
      // error. Return from test early.
      return;
    }

    // Data race did not occur, getJSON should have latest JSON.
    expect(data.data).toEqual(jsonNew);

    // assert our request history contains the expected amount of requests.
    expect(mock.history.get.length).toBe(2);
    expect(mock.history.post.length).toBe(4);
  });

  it("should not mess up cache when two setJSON calls are made simultaneously and one fails", async () => {
    // Create a new client with a fresh revision cache.
    const client = new SkynetClient(portalUrl);

    // Mock a successful setJSON.
    mock.onPost(uploadUrl).replyOnce(200, { skylink: skylinkOld, merkleroot, bitfield });
    mock.onPost(registryPostUrl).replyOnce(204);

    const values = await Promise.allSettled([
      client.db.setJSON(privateKey, dataKey, jsonOld),
      client.db.setJSON(privateKey, dataKey, jsonOld),
    ]);

    checkSettledValuesForErrorOrValue<JSONResponse>(values, concurrentAccessError);

    const cachedRevisionEntry = await client.revisionNumberCache.getRevisionAndMutexForEntry(publicKey, dataKey);
    expect(cachedRevisionEntry.revision.toString()).toEqual("0");

    // Make a getJSON call.
    mock.onGet(registryGetUrl).replyOnce(200, JSON.stringify(entryDataOld));
    mock.onGet(skylinkOldUrl).replyOnce(200, skynetJsonOld, headersOld);
    const { data: receivedJson1 } = await client.db.getJSON(publicKey, dataKey);

    expect(receivedJson1).toEqual(jsonOld);

    // Make another setJSON call - it should still work.
    mock.onPost(uploadUrl).replyOnce(200, { skylink: skylinkNew, merkleroot, bitfield });
    mock.onPost(registryPostUrl).replyOnce(204);
    await client.db.setJSON(privateKey, dataKey, jsonNew);

    expect(cachedRevisionEntry.revision.toString()).toEqual("1");

    // Make a getJSON call.
    mock.onGet(registryGetUrl).replyOnce(200, JSON.stringify(entryDataNew));
    mock.onGet(skylinkNewUrl).replyOnce(200, skynetJsonNew, headersNew);
    const { data: receivedJson2 } = await client.db.getJSON(publicKey, dataKey);

    expect(receivedJson2).toEqual(jsonNew);

    expect(mock.history.get.length).toBe(4);
    expect(mock.history.post.length).toBe(4);
  });

  it("should not mess up cache when two setJSON calls are made simultaneously on different clients and one fails", async () => {
    // Create two new clients with a fresh revision cache.
    const client1 = new SkynetClient(portalUrl);
    const client2 = new SkynetClient(portalUrl);

    // Run two simultaneous setJSONs on two different clients - one should work,
    // one should fail due to bad revision number.

    // Mock a successful setJSON.
    mock.onPost(uploadUrl).replyOnce(200, { skylink: skylinkOld, merkleroot, bitfield });
    mock.onPost(registryPostUrl).replyOnce(204);
    // Mock a failed setJSON (bad revision number).
    mock.onPost(uploadUrl).replyOnce(200, { skylink: skylinkOld, merkleroot, bitfield });
    mock.onPost(registryPostUrl).replyOnce(400);

    const values = await Promise.allSettled([
      client1.db.setJSON(privateKey, dataKey, jsonOld),
      client2.db.setJSON(privateKey, dataKey, jsonOld),
    ]);

    let successClient;
    let failClient;
    if (values[0].status === "rejected") {
      successClient = client2;
      failClient = client1;
    } else {
      successClient = client1;
      failClient = client2;
    }

    // Test that the client that succeeded has a consistent cache.

    const cachedRevisionEntrySuccess = await successClient.revisionNumberCache.getRevisionAndMutexForEntry(
      publicKey,
      dataKey
    );
    expect(cachedRevisionEntrySuccess.revision.toString()).toEqual("0");

    // Make a getJSON call.
    mock.onGet(registryGetUrl).replyOnce(200, JSON.stringify(entryDataOld));
    mock.onGet(skylinkOldUrl).replyOnce(200, skynetJsonOld, headersOld);
    const { data: receivedJson1 } = await successClient.db.getJSON(publicKey, dataKey);

    expect(receivedJson1).toEqual(jsonOld);

    // Make another setJSON call - it should still work.
    mock.onPost(uploadUrl).replyOnce(200, { skylink: skylinkNew, merkleroot, bitfield });
    mock.onPost(registryPostUrl).replyOnce(204);
    await successClient.db.setJSON(privateKey, dataKey, jsonNew);

    expect(cachedRevisionEntrySuccess.revision.toString()).toEqual("1");

    // Make a getJSON call.
    mock.onGet(registryGetUrl).replyOnce(200, JSON.stringify(entryDataNew));
    mock.onGet(skylinkNewUrl).replyOnce(200, skynetJsonNew, headersNew);
    const { data: receivedJson2 } = await successClient.db.getJSON(publicKey, dataKey);

    expect(receivedJson2).toEqual(jsonNew);

    // Test that the client that failed has a consistent cache.

    const cachedRevisionEntryFail = await failClient.revisionNumberCache.getRevisionAndMutexForEntry(
      publicKey,
      dataKey
    );
    expect(cachedRevisionEntryFail.revision.toString()).toEqual("-1");

    // Make a getJSON call.
    mock.onGet(registryGetUrl).replyOnce(200, JSON.stringify(entryDataOld));
    mock.onGet(skylinkOldUrl).replyOnce(200, skynetJsonOld, headersOld);
    const { data: receivedJsonFail1 } = await failClient.db.getJSON(publicKey, dataKey);

    expect(receivedJsonFail1).toEqual(jsonOld);

    // Make another setJSON call - it should still work.
    mock.onPost(uploadUrl).replyOnce(200, { skylink: skylinkNew, merkleroot, bitfield });
    mock.onPost(registryPostUrl).replyOnce(204);
    await failClient.db.setJSON(privateKey, dataKey, jsonNew);

    expect(cachedRevisionEntrySuccess.revision.toString()).toEqual("1");

    // Make a getJSON call.
    mock.onGet(registryGetUrl).replyOnce(200, JSON.stringify(entryDataNew));
    mock.onGet(skylinkNewUrl).replyOnce(200, skynetJsonNew, headersNew);
    const { data: receivedJsonFail2 } = await failClient.db.getJSON(publicKey, dataKey);

    expect(receivedJsonFail2).toEqual(jsonNew);

    // Check final request counts.

    expect(mock.history.get.length).toBe(8);
    expect(mock.history.post.length).toBe(8);
  });

  /**
   * Checks the settled values from Promise.allSettled for the given error.
   * Throws if an unexpected error is found. Returns settled value if no errors
   * were found.
   *
   * @param values - The settled values.
   * @param err - The err to check for.
   * @returns - The settled value if no errors were found, or null if the expected error was found.
   * @throws - Will throw if an unexpected error occurred.
   */
  function checkSettledValuesForErrorOrValue<T>(values: PromiseSettledResult<T>[], err: string): T | null {
    let rejected = false;
    let reason;
    let receivedValue: T | null = null;
    for (const value of values) {
      if (value.status === "rejected") {
        rejected = true;
        reason = value.reason;
      } else if (value.value) {
        receivedValue = value.value;
      }
    }
    if (rejected) {
      // TODO: Don't return early.
      if ((reason as Error).message.includes(err)) {
        // The data race condition was avoided and we received the expected
        // error. Return from test early.
        return null;
      } else {
        // Unexpected error, throw.
        throw reason as Error;
      }
    }

    return receivedValue;
  }
});
