import axios from "axios";
import MockAdapter from "axios-mock-adapter";

import { getSkylinkUrlForPortal } from "./download";
import { MAX_REVISION } from "./utils/number";
import { defaultSkynetPortalUrl, uriSkynetPrefix } from "./utils/url";
import { SkynetClient, genKeyPairFromSeed } from "./index";
import { getEntryUrlForPortal, regexRevisionNoQuotes } from "./registry";

const { publicKey, privateKey } = genKeyPairFromSeed("insecure test seed");
const dataKey = "app";
const skylink = "CABAB_1Dt0FJsxqsu_J4TodNCbCGvtFf1Uys_3EgzOlTcg";
const sialink = `${uriSkynetPrefix}${skylink}`;
const jsonData = { data: "thisistext" };
const fullJsonData = { _data: jsonData, _v: 2 };
const legacyJsonData = jsonData;
const merkleroot = "QAf9Q7dBSbMarLvyeE6HTQmwhr7RX9VMrP9xIMzpU3I";
const bitfield = 2048;

const portalUrl = defaultSkynetPortalUrl;
const client = new SkynetClient(portalUrl);
const registryUrl = `${portalUrl}/skynet/registry`;
const registryLookupUrl = getEntryUrlForPortal(portalUrl, publicKey, dataKey);
const uploadUrl = `${portalUrl}/skynet/skyfile`;
const skylinkUrl = getSkylinkUrlForPortal(portalUrl, skylink);

// Hex-encoded skylink.
const data = "43414241425f31447430464a73787173755f4a34546f644e4362434776744666315579735f3345677a4f6c546367";
const revision = 11;
const entryData = {
  data,
  revision,
  signature:
    "33d14d2889cb292142614da0e0ff13a205c4867961276001471d13b779fc9032568ddd292d9e0dff69d7b1f28be07972cc9d86da3cecf3adecb6f9b7311af809",
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
    mock.onGet(registryLookupUrl).replyOnce(200, JSON.stringify(entryData));
    mock.onGet(skylinkUrl).replyOnce(200, fullJsonData, {});

    const { data, dataLink } = await client.db.getJSON(publicKey, dataKey);
    expect(data).toEqual(jsonData);
    expect(dataLink).toEqual(sialink);
    expect(mock.history.get.length).toBe(2);
  });

  it("should perform a lookup but not a skylink GET if the cachedDataLink is a hit", async () => {
    // mock a successful registry lookup
    mock.onGet(registryLookupUrl).replyOnce(200, JSON.stringify(entryData));

    const { data, dataLink } = await client.db.getJSON(publicKey, dataKey, { cachedDataLink: skylink });
    expect(data).toBeNull();
    expect(dataLink).toEqual(sialink);
    expect(mock.history.get.length).toBe(1);
  });

  it("should perform a lookup and a skylink GET if the cachedDataLink is not a hit", async () => {
    // mock a successful registry lookup
    mock.onGet(registryLookupUrl).replyOnce(200, JSON.stringify(entryData));
    mock.onGet(skylinkUrl).replyOnce(200, fullJsonData, {});

    const { data, dataLink } = await client.db.getJSON(publicKey, dataKey, { cachedDataLink: "asdf" });
    expect(data).toEqual(jsonData);
    expect(dataLink).toEqual(sialink);
    expect(mock.history.get.length).toBe(2);
  });

  it("should perform a lookup and skylink GET on legacy pre-v4 data", async () => {
    // mock a successful registry lookup
    mock.onGet(registryLookupUrl).replyOnce(200, JSON.stringify(entryData));
    mock.onGet(skylinkUrl).replyOnce(200, legacyJsonData, {});

    const jsonReturned = await client.db.getJSON(publicKey, dataKey);
    expect(jsonReturned.data).toEqual(jsonData);
    expect(mock.history.get.length).toBe(2);
  });

  it("should return null if no entry is found", async () => {
    mock.onGet(registryLookupUrl).reply(404);

    const { data, dataLink } = await client.db.getJSON(publicKey, dataKey);
    expect(data).toBeNull();
    expect(dataLink).toBeNull();
  });

  it("should throw if the returned file data is not JSON", async () => {
    // mock a successful registry lookup
    mock.onGet(registryLookupUrl).reply(200, JSON.stringify(entryData));
    mock.onGet(skylinkUrl).reply(200, "thisistext", {});

    await expect(client.db.getJSON(publicKey, dataKey)).rejects.toThrowError(
      `File data for the entry at data key '${dataKey}' is not JSON.`
    );
  });

  it("should throw if the returned _data field in the file data is not JSON", async () => {
    // mock a successful registry lookup
    mock.onGet(registryLookupUrl).reply(200, JSON.stringify(entryData));
    mock.onGet(skylinkUrl).reply(200, { _data: "thisistext", _v: 1 }, {});

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
    // mock a successful registry lookup
    mock.onGet(registryLookupUrl).replyOnce(200, JSON.stringify(entryData));

    // mock a successful registry update
    mock.onPost(registryUrl).replyOnce(204);

    // set data
    const { data: returnedData, dataLink: returnedSkylink } = await client.db.setJSON(privateKey, dataKey, jsonData);
    expect(returnedData).toEqual(jsonData);
    expect(returnedSkylink).toEqual(sialink);

    // assert our request history contains the expected amount of requests
    expect(mock.history.get.length).toBe(1);
    expect(mock.history.post.length).toBe(2);

    const data = JSON.parse(mock.history.post[1].data);
    expect(data).toBeDefined();
    expect(data.revision).toEqual(revision + 1);
  });

  it("should use a revision number of 0 if the lookup failed", async () => {
    mock.onGet(registryLookupUrl).reply(404);

    // mock a successful registry update
    mock.onPost(registryUrl).reply(204);

    // call `setJSON` on the client
    await client.db.setJSON(privateKey, dataKey, jsonData);

    // assert our request history contains the expected amount of requests
    expect(mock.history.get.length).toBe(1);
    expect(mock.history.post.length).toBe(2);

    const data = JSON.parse(mock.history.post[1].data);
    expect(data).toBeDefined();
    expect(data.revision).toEqual(0);
  });

  it("should fail if the entry has the maximum allowed revision", async () => {
    // mock a successful registry lookup
    const entryData = {
      data,
      // String the bigint since JS doesn't support 64-bit numbers.
      revision: MAX_REVISION.toString(),
      signature:
        "18c76e88141c7cc76d8a77abcd91b5d64d8fc3833eae407ab8a5339e5fcf7940e3fa5830a8ad9439a0c0cc72236ed7b096ae05772f81eee120cbd173bfd6600e",
    };
    // Replace the quotes around the stringed bigint.
    const json = JSON.stringify(entryData).replace(regexRevisionNoQuotes, '"revision":"$1"');
    mock.onGet(registryLookupUrl).reply(200, json);

    // mock a successful registry update
    mock.onPost(registryUrl).reply(204);

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
});
