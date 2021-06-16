import axios from "axios";
import MockAdapter from "axios-mock-adapter";

import { genKeyPairAndSeed } from "./crypto";
import { SkynetClient, defaultSkynetPortalUrl, genKeyPairFromSeed } from "./index";
import { getEntryUrlForPortal, signEntry } from "./registry";
import { uriSkynetPrefix } from "./utils/url";
import { stringToUint8ArrayUtf8 } from "./utils/string";

const { publicKey, privateKey } = genKeyPairFromSeed("insecure test seed");
const portalUrl = defaultSkynetPortalUrl;
const client = new SkynetClient(portalUrl);
const dataKey = "app";

const registryLookupUrl = getEntryUrlForPortal(portalUrl, publicKey, dataKey);

describe("getEntry", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    mock.resetHistory();
  });

  it("should throw if the response status is not in the 200s and not 404 and JSON is returned", async () => {
    mock.onGet(registryLookupUrl).replyOnce(400, JSON.stringify({ message: "foo error" }));

    await expect(client.registry.getEntry(publicKey, dataKey)).rejects.toThrowError(
      "Request failed with status code 400"
    );
  });

  it("should throw if the response status is not in the 200s and not 404 and HTML is returned", async () => {
    const responseHTML = `
<head><title>429 Too Many Requests</title></head>
<body>
<center><h1>429 Too Many Requests</h1></center>
<hr><center>openresty/1.19.3.1</center>
</body>
</html>`;

    mock.onGet(registryLookupUrl).replyOnce(429, responseHTML);

    await expect(client.registry.getEntry(publicKey, dataKey)).rejects.toThrowError(
      "Request failed with status code 429"
    );
  });

  it("should throw if the signature could not be verified", async () => {
    // Use a signature that shouldn't work.
    const entryData = {
      data: "43414241425f31447430464a73787173755f4a34546f644e4362434776744666315579735f3345677a4f6c546367",
      revision: "11",
      signature:
        "33d14d2889cb292142614da0e0ff13a205c4867961276001471d13b779fc9032568ddd292d9e0dff69d7b1f28be07972cc9d86da3cecf3adecb6f9b7311af808",
    };

    mock.onGet(registryLookupUrl).replyOnce(200, JSON.stringify(entryData));

    await expect(client.registry.getEntry(publicKey, dataKey)).rejects.toThrow();
  });

  it("Should throw an error if the public key is not hex-encoded", async () => {
    await expect(client.registry.getEntry("foo", dataKey)).rejects.toThrowError(
      "Expected parameter 'publicKey' to be a hex-encoded string with a valid prefix, was type 'string', value 'foo'"
    );
  });

  it("Should throw on incomplete response from registry GET", async () => {
    mock.onGet(registryLookupUrl).replyOnce(200, "{}");

    await expect(client.registry.getEntry(publicKey, dataKey)).rejects.toThrowError(
      "Did not get a complete entry response"
    );
  });
});

describe("getEntryLink", () => {
  it("should get the correct entry link", async () => {
    const publicKey = "a1790331b8b41a94644d01a7b482564e7049047812364bcabc32d399ad23f7e2";
    const dataKey = "d321b3c31337047493c9b5a99675e9bdaea44218a31aad2fd7738209e7a5aca1";
    const expectedEntryLink = `${uriSkynetPrefix}AQB7zHVDtD-PikoAD_0zzFbWWPcY-IJoJRHXFJcwoU-WvQ`;

    const entryLink = await client.registry.getEntryLink(publicKey, dataKey, { hashedDataKeyHex: true });

    expect(entryLink).toEqual(expectedEntryLink);
  });
});

describe("getEntryUrl", () => {
  // Hard-code public key and expected encoded values to catch any breaking changes to the encoding code.
  const publicKey = "c1197e1275fbf570d21dde01a00af83ed4a743d1884e4a09cebce0dd21ae254c";
  const encodedPK = "ed25519%3Ac1197e1275fbf570d21dde01a00af83ed4a743d1884e4a09cebce0dd21ae254c";
  const encodedDK = "7c96a0537ab2aaac9cfe0eca217732f4e10791625b4ab4c17e4d91c8078713b9";

  it("should generate the correct registry url for the given entry", async () => {
    const url = await client.registry.getEntryUrl(publicKey, dataKey);

    expect(url).toEqual(`${portalUrl}/skynet/registry?publickey=${encodedPK}&datakey=${encodedDK}&timeout=5`);
  });

  it("Should throw if a timeout is provided", async () => {
    const { publicKey } = genKeyPairAndSeed();

    // @ts-expect-error - Pass an invalid timeout parameter on purpose.
    await expect(client.registry.getEntryUrl(publicKey, dataKey, { timeout: 1.5 })).rejects.toThrowError(
      "Object parameter 'customOptions' contains unexpected property 'timeout'"
    );
  });

  it("should trim the prefix if it is provided", async () => {
    const url = await client.registry.getEntryUrl(`ed25519:${publicKey}`, dataKey);

    expect(url).toEqual(`${portalUrl}/skynet/registry?publickey=${encodedPK}&datakey=${encodedDK}&timeout=5`);
  });
});

describe("setEntry", () => {
  it("Should throw an error if the private key is not hex-encoded", async () => {
    // @ts-expect-error We pass an invalid private key on purpose.
    await expect(client.registry.setEntry("foo", {})).rejects.toThrowError(
      "Expected parameter 'privateKey' to be a hex-encoded string, was type 'string', value 'foo'"
    );
  });

  it("Should throw an error if the entry is not an object", async () => {
    // @ts-expect-error We do not pass an entry on purpose.
    await expect(client.registry.setEntry(privateKey)).rejects.toThrowError(
      "Expected parameter 'entry' to be type 'object', was type 'undefined'"
    );
  });
});

describe("signEntry", () => {
  it("Should throw if we try to sign an entry with a prehashed data key that is not in hex format", async () => {
    const entry = { data: stringToUint8ArrayUtf8("test"), dataKey: "test", revision: BigInt(0) };
    await expect(signEntry(privateKey, entry, true)).rejects.toThrowError(
      "Expected parameter 'str' to be a hex-encoded string, was type 'string', value 'test'"
    );
  });
});
