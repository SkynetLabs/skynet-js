import axios from "axios";
import MockAdapter from "axios-mock-adapter";

import { random } from "node-forge";
import { addUrlQuery, defaultSkynetPortalUrl, randomNumber } from "./utils";
import { SkynetClient } from ".";
import { FileType, FileID, SkyFile, User } from "./skydb";

describe("User", () => {
  it("should have set a user id", async () => {
    const user = new User("john.doe@example.com", "supersecret");
    expect(user.id.length).toBeGreaterThan(0);
  });

  it("should be deterministic", async () => {
    const username = random.getBytesSync(randomNumber(6, 24));
    const password = random.getBytesSync(randomNumber(12, 64));
    const expected = new User(username, password);
    for (let i = 0; i < 100; i++) {
      expect(new User(username, password).id).toEqual(expected.id);
    }
  });
});

const user = new User("john.doe@example.com", "supersecret");

const appID = "SkySkapp";
const filename = "foo.txt";
const fileID = new FileID(appID, FileType.PublicUnencrypted, filename);

const skylink = "CABAB_1Dt0FJsxqsu_J4TodNCbCGvtFf1Uys_3EgzOlTcg";

const portalUrl = defaultSkynetPortalUrl;
const registryUrl = `${portalUrl}/skynet/registry`;
const uploadUrl = `${portalUrl}/skynet/skyfile`;

const client = new SkynetClient(portalUrl);

describe.skip("getFile", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    mock.resetHistory();
  });

  it("should perform a lookup and update the window to the skylink url", async () => {
    // mock a successful registry lookup
    const registryLookupUrl = addUrlQuery(registryUrl, {
      publickey: `ed25519:${user.id}`,
      fileid: Buffer.from(
        JSON.stringify({
          version: fileID.version,
          applicationid: fileID.applicationID,
          filetype: fileID.fileType,
          filename: fileID.filename,
        })
      ).toString("hex"),
    });

    mock.onGet(registryLookupUrl).reply(200, {
      tweak: "3b0f02e66373877503325e44b6973279d2e2a9c21e75b17adccb378d05cf40ae",
      data: "41414333544f713757324a516c6a507567744d6a453555734a676973696b59624538465571677069646659486751",
      revision: 11,
      signature:
        "7a971e1df2ddbb8ef1f8e71e28a5a64ffe1e5dfcb7eebb19e6c238744133ddeefc4f286488dd4500c33610711e3447b49e5a30df2e590e27ad00e56ebf3baf04",
    });

    // TODO mock skylink download request

    await client.getFile(user, fileID);
    expect(mock.history.get.length).toBe(1);
  });
});

describe("setFile", () => {
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
      publickey: `ed25519:${user.id}`,
      fileid: Buffer.from(
        JSON.stringify({
          version: fileID.version,
          applicationid: fileID.applicationID,
          filetype: fileID.fileType,
          filename: fileID.filename,
        })
      ).toString("hex"),
    });

    mock.onGet(registryLookupUrl).reply(200, {
      tweak: "3b0f02e66373877503325e44b6973279d2e2a9c21e75b17adccb378d05cf40ae",
      data: "41414333544f713757324a516c6a507567744d6a453555734a676973696b59624538465571677069646659486751",
      revision: 11,
      signature:
        "7a971e1df2ddbb8ef1f8e71e28a5a64ffe1e5dfcb7eebb19e6c238744133ddeefc4f286488dd4500c33610711e3447b49e5a30df2e590e27ad00e56ebf3baf04",
    });

    // mock a successful registry update
    mock.onPost(registryUrl).reply(204);

    // mock a file
    const file = new File(["thisistext"], filename, { type: "text/plain" });

    // call `setFile` on the client
    await client.setFile(user, fileID, new SkyFile(file));

    // assert our request history contains the expected amount of requests
    expect(mock.history.get.length).toBe(1);
    expect(mock.history.post.length).toBe(2);
  });

  it("should use a revision number of 0 if the lookup failed", async () => {
    // mock a successful upload
    mock.onPost(uploadUrl).reply(200, { skylink });

    // mock a failed registry lookup
    const registryLookupUrl = addUrlQuery(registryUrl, {
      publickey: `ed25519:${user.id}`,
      fileid: Buffer.from(
        JSON.stringify({
          version: fileID.version,
          applicationid: fileID.applicationID,
          filetype: fileID.fileType,
          filename: fileID.filename,
        })
      ).toString("hex"),
    });

    mock.onGet(registryLookupUrl).reply(400);

    // mock a successful registry update
    mock.onPost(registryUrl).reply(204);

    // mock a file
    const file = new File(["thisistext"], filename, { type: "text/plain" });

    // call `setFile` on the client
    await client.setFile(user, fileID, new SkyFile(file));

    // assert our request history contains the expected amount of requests
    expect(mock.history.get.length).toBe(1);
    expect(mock.history.post.length).toBe(2);

    const data = JSON.parse(mock.history.post[1].data);
    expect(data).toBeDefined();
    expect(data.revision).toEqual(0);
  });
});
