import axios from "axios";
import MockAdapter from "axios-mock-adapter";

import { genKeyPairAndSeed, SIGNATURE_LENGTH } from "./crypto";
import { SkynetClient, defaultSkynetPortalUrl, genKeyPairFromSeed } from "./index";
import { getEntryLink, getEntryUrlForPortal, signEntry, validateRegistryProof } from "./registry";
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
  const publicKey = "a1790331b8b41a94644d01a7b482564e7049047812364bcabc32d399ad23f7e2";
  const dataKey = "d321b3c31337047493c9b5a99675e9bdaea44218a31aad2fd7738209e7a5aca1";

  it("should get the correct entry link for hashedDataKeyHex: false", async () => {
    const expectedEntryLink = `${uriSkynetPrefix}AQBT237lo425ivk3Si6sOKretXxsDwO6DT1M0_Ui3oT0OA`;

    const entryLink = getEntryLink(publicKey, dataKey, { hashedDataKeyHex: false });

    expect(entryLink).toEqual(expectedEntryLink);
  });

  it("should get the correct entry link for hashedDataKeyHex: true", async () => {
    const expectedEntryLink = `${uriSkynetPrefix}AQB7zHVDtD-PikoAD_0zzFbWWPcY-IJoJRHXFJcwoU-WvQ`;

    const entryLink = getEntryLink(publicKey, dataKey, { hashedDataKeyHex: true });

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
  it("should derive the correct signature", async () => {
    // Hard-code expected value to catch breaking changes.
    const expectedSignature = [
      133, 154, 188, 25, 22, 198, 83, 227, 64, 89, 92, 137, 232, 240, 27, 215, 31, 207, 179, 160, 142, 4, 136, 12, 137,
      119, 163, 150, 210, 114, 50, 94, 157, 128, 80, 18, 54, 125, 230, 233, 44, 109, 167, 40, 132, 33, 134, 13, 75, 48,
      130, 200, 120, 173, 141, 196, 238, 235, 178, 186, 48, 208, 241, 13,
    ];
    const entry = {
      data: new Uint8Array([1, 2, 3]),
      dataKey: "foo",
      revision: BigInt(11),
    };

    const signature = await signEntry(privateKey, entry, false);

    expect(signature.length).toEqual(SIGNATURE_LENGTH);
    expect(signature).toEqual(new Uint8Array(expectedSignature));
  });

  it("should throw if we try to sign an entry with a prehashed data key that is not in hex format", async () => {
    const entry = { data: stringToUint8ArrayUtf8("test"), dataKey: "test", revision: BigInt(0) };
    await expect(signEntry(privateKey, entry, true)).rejects.toThrowError(
      "Expected parameter 'str' to be a hex-encoded string, was type 'string', value 'test'"
    );
  });
});

describe("validateRegistryProof", () => {
  it("Should verify a valid registry proof", () => {
    const proof = [
      {
        data: "5c006f8bb26d25b412300703c275279a9d852833e383cfed4d314fe01c0c4b155d12",
        revision: 0,
        datakey: "43c8a9b01609544ab152dad397afc3b56c1518eb546750dbc6cad5944fec0292",
        publickey: { algorithm: "ed25519", key: "y/l99FyfFm6JPhZL5xSkruhA06Qh9m5S9rnipQCc+rw=" },
        signature:
          "5a1437508eedb6f5352d7f744693908a91bb05c01370ce4743de9c25f761b4e87760b8172448c073a4ddd9d58d1a2bf978b3227e57e4fa8cbe830a2353be2207",
        type: 1,
      },
    ];
    const expectedSkylink = "XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg";
    const expectedResolverSkylink = "AQDwh1jnoZas9LaLHC_D4-2yP9XYDdZzNtz62H4Dww1jDA";

    const { skylink, resolverSkylink } = validateRegistryProof(proof);

    expect(skylink).toEqual(expectedSkylink);
    expect(resolverSkylink).toEqual(expectedResolverSkylink);
  });
});
