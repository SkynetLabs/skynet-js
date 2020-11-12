import axios from "axios";
import MockAdapter from "axios-mock-adapter";

import { addUrlQuery, defaultSkynetPortalUrl } from "./utils";
import { SkynetClient, genKeyPairAndSeed } from "./index";

const { publicKey, privateKey } = genKeyPairAndSeed();
const dataKey = "app";
const skylink = "CABAB_1Dt0FJsxqsu_J4TodNCbCGvtFf1Uys_3EgzOlTcg";
const json = { data: "thisistext" };

const portalUrl = defaultSkynetPortalUrl;
const registryUrl = `${portalUrl}/skynet/registry`;
const uploadUrl = `${portalUrl}/skynet/skyfile`;

const client = new SkynetClient(portalUrl);

describe("getJSON", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    mock.resetHistory();
  });

  // TODO
  it.skip("should perform a lookup and skylink GET", async () => {
    // mock a successful registry lookup
    const params = {
      publickey: `ed25519:${publicKey}`,
      datakey: dataKey,
    };
    const registryLookupUrl = addUrlQuery(registryUrl, params);

    const data = {
      data: "41414333544f713757324a516c6a507567744d6a453555734a676973696b59624538465571677069646659486751",
      revision: 11,
      signature:
        "7a971e1df2ddbb8ef1f8e71e28a5a64ffe1e5dfcb7eebb19e6c238744133ddeefc4f286488dd4500c33610711e3447b49e5a30df2e590e27ad00e56ebf3baf04",
    };
    mock.onGet(registryLookupUrl).reply(200, data);

    // TODO mock skylink download request

    await client.db.getJSON(publicKey, dataKey);
    expect(mock.history.get.length).toBe(1);
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
    const registryLookupUrl = addUrlQuery(registryUrl, {
      publickey: `ed25519:${publicKey}`,
      datakey: dataKey,
    });

    mock.onGet(registryLookupUrl).reply(200, {
      data: "41414333544f713757324a516c6a507567744d6a453555734a676973696b59624538465571677069646659486751",
      revision: 11,
      signature:
        "7a971e1df2ddbb8ef1f8e71e28a5a64ffe1e5dfcb7eebb19e6c238744133ddeefc4f286488dd4500c33610711e3447b49e5a30df2e590e27ad00e56ebf3baf04",
    });

    // mock a successful registry update
    mock.onPost(registryUrl).reply(204);

    // set data
    const updated = await client.db.setJSON(privateKey, dataKey, json);

    expect(updated);

    // assert our request history contains the expected amount of requests
    expect(mock.history.get.length).toBe(1);
    expect(mock.history.post.length).toBe(2);
  });

  it("should use a revision number of 0 if the lookup failed", async () => {
    // mock a successful upload
    mock.onPost(uploadUrl).reply(200, { skylink });

    // mock a failed registry lookup
    const registryLookupUrl = addUrlQuery(registryUrl, {
      publickey: `ed25519:${publicKey}`,
      datakey: dataKey,
    });

    mock.onGet(registryLookupUrl).reply(400);

    // mock a successful registry update
    mock.onPost(registryUrl).reply(204);

    // call `setJSON` on the client
    const updated = await client.db.setJSON(privateKey, dataKey, json);

    expect(updated);

    // assert our request history contains the expected amount of requests
    expect(mock.history.get.length).toBe(1);
    expect(mock.history.post.length).toBe(2);

    const data = JSON.parse(mock.history.post[1].data);
    expect(data).toBeDefined();
    expect(data.revision).toEqual(0);
  });
});
