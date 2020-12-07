import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { genKeyPairAndSeed } from "./crypto";
import { SkynetClient, defaultSkynetPortalUrl, genKeyPairFromSeed } from "./index";
import { MAX_GET_ENTRY_TIMEOUT } from "./registry";

const { publicKey, privateKey } = genKeyPairFromSeed("insecure test seed");
const portalUrl = defaultSkynetPortalUrl;
const client = new SkynetClient(portalUrl);
const dataKey = "app";

const registryLookupUrl = client.registry.getEntryUrl(publicKey, dataKey);
const entryData = {
  data: "43414241425f31447430464a73787173755f4a34546f644e4362434776744666315579735f3345677a4f6c546367",
  revision: "11",
  signature:
    "33d14d2889cb292142614da0e0ff13a205c4867961276001471d13b779fc9032568ddd292d9e0dff69d7b1f28be07972cc9d86da3cecf3adecb6f9b7311af809",
};
const json = JSON.stringify(entryData);

describe("getEntry", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    mock.resetHistory();
  });

  it("should return null if the response status is in the 200s but not 200", async () => {
    mock.onGet(registryLookupUrl).reply(201, json);

    const { entry, signature } = await client.registry.getEntry(publicKey, dataKey);
    expect(entry).toBeNull();
    expect(signature).toBeNull();
  });

  it("should return null if the response status is not in the 200s", async () => {
    mock.onGet(registryLookupUrl).reply(300, json);

    const { entry, signature } = await client.registry.getEntry(publicKey, dataKey);
    expect(entry).toBeNull();
    expect(signature).toBeNull();
  });

  it("should throw if the signature could not be verified", async () => {
    // Use a signature that shouldn't work.
    const entryData = {
      data: "43414241425f31447430464a73787173755f4a34546f644e4362434776744666315579735f3345677a4f6c546367",
      revision: "11",
      signature:
        "33d14d2889cb292142614da0e0ff13a205c4867961276001471d13b779fc9032568ddd292d9e0dff69d7b1f28be07972cc9d86da3cecf3adecb6f9b7311af808",
    };

    mock.onGet(registryLookupUrl).reply(200, JSON.stringify(entryData));

    await expect(client.registry.getEntry(publicKey, dataKey)).rejects.toThrow();
  });

  it("Should return an error if the timeout is too large", async () => {
    const { publicKey } = genKeyPairAndSeed();

    // Try getting an entry with an excessive timeout.
    await expect(
      client.registry.getEntry(publicKey, dataKey, {
        timeout: MAX_GET_ENTRY_TIMEOUT + 1,
      })
    ).rejects.toThrowError(
      `Invalid 'timeout' parameter '${
        MAX_GET_ENTRY_TIMEOUT + 1
      }', needs to be an integer between 1s and ${MAX_GET_ENTRY_TIMEOUT}s`
    );

    // No network calls should have been made.
    expect(mock.history.get.length).toBe(0);
    expect(mock.history.post.length).toBe(0);
  });

  it("should throw when key is not hex-encoded", async () => {
    await expect(client.registry.getEntry(`${publicKey}x`, dataKey)).rejects.toThrowError(
      `Given public key '${publicKey}x' is not a valid hex-encoded string or contains an invalid prefix`
    );
  });
});

describe("getEntryUrl", () => {
  // Hard-code public key and expected encoded values to catch any breaking changes to the encoding code.
  const publicKey = "c1197e1275fbf570d21dde01a00af83ed4a743d1884e4a09cebce0dd21ae254c";
  const encodedPK = "ed25519%3Ac1197e1275fbf570d21dde01a00af83ed4a743d1884e4a09cebce0dd21ae254c";
  const encodedDK = "7c96a0537ab2aaac9cfe0eca217732f4e10791625b4ab4c17e4d91c8078713b9";

  it("should generate the correct registry url for the given entry", () => {
    const url = client.registry.getEntryUrl(publicKey, dataKey);

    expect(url).toEqual(`${portalUrl}/skynet/registry?publickey=${encodedPK}&datakey=${encodedDK}&timeout=5`);
  });

  it("Should throw if the timeout is not an integer", () => {
    const { publicKey } = genKeyPairAndSeed();

    expect(() => client.registry.getEntryUrl(publicKey, dataKey, { timeout: 1.5 })).toThrowError(
      "Invalid 'timeout' parameter '1.5', needs to be an integer between 1s and 300s"
    );
  });

  it("should trim the prefix if it is provided", () => {
    const url = client.registry.getEntryUrl(`ed25519:${publicKey}`, dataKey);

    expect(url).toEqual(`${portalUrl}/skynet/registry?publickey=${encodedPK}&datakey=${encodedDK}&timeout=5`);
  });
});

describe("setEntry", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    mock.resetHistory();
  });

  it("should throw when key is not hex-encoded", async () => {
    await expect(client.registry.setEntry(`${privateKey}x`, {})).rejects.toThrowError(
      `Given private key '${privateKey}x' is not a valid hex-encoded string`
    );
  });
});
