import axios from "axios";
import MockAdapter from "axios-mock-adapter";

import { defaultSkynetPortalUrl, MAX_REVISION } from "./utils";
import { SkynetClient, genKeyPairFromSeed } from "./index";
import { regexRevisionNoQuotes } from "./registry";

const { publicKey, privateKey } = genKeyPairFromSeed("insecure test seed");
const dataKey = "app";
const skylink = "CABAB_1Dt0FJsxqsu_J4TodNCbCGvtFf1Uys_3EgzOlTcg";
const json = { data: "thisistext" };

const portalUrl = defaultSkynetPortalUrl;
const client = new SkynetClient(portalUrl);
const registryUrl = `${portalUrl}/skynet/registry`;
const registryLookupUrl = client.registry.getEntryUrl(publicKey, dataKey);
const uploadUrl = `${portalUrl}/skynet/skyfile`;

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
    mock.resetHistory();
  });

  it("should perform a lookup and skylink GET", async () => {
    // mock a successful registry lookup
    mock.onGet(registryLookupUrl).reply(200, JSON.stringify(entryData));
    mock.onGet(client.getSkylinkUrl(skylink)).reply(200, json);

    const jsonReturned = await client.db.getJSON(publicKey, dataKey);
    expect(jsonReturned.data).toEqual(json);
    expect(mock.history.get.length).toBe(2);
  });

  it("should return null if no entry is found", async () => {
    mock.onGet(registryLookupUrl).reply(404);

    const { data, revision } = await client.db.getJSON(publicKey, dataKey);
    expect(data).toBeNull();
    expect(revision).toBeNull();
  });
});

describe("setJSON", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    mock.resetHistory();
  });

  it("should perform an upload, lookup and registry update", async () => {
    // mock a successful upload
    mock.onPost(uploadUrl).reply(200, { skylink });

    // mock a successful registry lookup
    mock.onGet(registryLookupUrl).reply(200, JSON.stringify(entryData));

    // mock a successful registry update
    mock.onPost(registryUrl).reply(204);

    // set data
    await client.db.setJSON(privateKey, dataKey, json);

    // assert our request history contains the expected amount of requests
    expect(mock.history.get.length).toBe(1);
    expect(mock.history.post.length).toBe(2);

    const data = JSON.parse(mock.history.post[1].data);
    expect(data).toBeDefined();
    expect(data.revision).toEqual(revision + 1);
  });

  it("should use the revision if it is passed in", async () => {
    // mock a successful upload
    mock.onPost(uploadUrl).reply(200, { skylink });

    // mock a successful registry update
    mock.onPost(registryUrl).reply(204);

    // set data
    const updated = await client.db.setJSON(privateKey, dataKey, json, BigInt(revision + 1));

    expect(updated);

    // assert our request history contains the expected amount of requests
    expect(mock.history.post.length).toBe(2);

    const data = JSON.parse(mock.history.post[1].data);
    expect(data).toBeDefined();
    expect(data.revision).toEqual(revision + 1);
  });

  it("should use a revision number of 0 if the lookup failed", async () => {
    // mock a successful upload
    mock.onPost(uploadUrl).reply(200, { skylink });

    mock.onGet(registryLookupUrl).reply(404);

    // mock a successful registry update
    mock.onPost(registryUrl).reply(204);

    // call `setJSON` on the client
    await client.db.setJSON(privateKey, dataKey, json);

    // assert our request history contains the expected amount of requests
    expect(mock.history.get.length).toBe(1);
    expect(mock.history.post.length).toBe(2);

    const data = JSON.parse(mock.history.post[1].data);
    expect(data).toBeDefined();
    expect(data.revision).toEqual(0);
  });

  it("should fail if the entry has the maximum allowed revision", async () => {
    // mock a successful upload
    mock.onPost(uploadUrl).reply(200, { skylink });

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
    await expect(client.db.setJSON(privateKey, dataKey, json)).rejects.toThrowError(
      "Current entry already has maximum allowed revision, could not update the entry"
    );
  });
});
