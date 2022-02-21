import { client, dataKey, portal } from ".";
import { genKeyPairAndSeed, stringToUint8ArrayUtf8 } from "../src";

describe(`Registry end to end integration tests for portal '${portal}'`, () => {
  const skylink = "AABRKCTb6z9d-C-Hre-daX4-VIB8L7eydmEr8XRphnS8jg";
  const data = stringToUint8ArrayUtf8(skylink);

  it("Should return null for an inexistent entry", async () => {
    const { publicKey } = genKeyPairAndSeed();

    // Try getting an inexistent entry.
    const { entry, signature } = await client.registry.getEntry(publicKey, "foo");

    expect(entry).toBeNull();
    expect(signature).toBeNull();
  });

  it("Should set and get string entries correctly", async () => {
    const { publicKey, privateKey } = genKeyPairAndSeed();

    const entry = {
      dataKey,
      data,
      revision: BigInt(0),
    };

    await client.registry.setEntry(privateKey, entry);

    const { entry: returnedEntry } = await client.registry.getEntry(publicKey, dataKey);
    expect(returnedEntry).not.toBeNull();

    expect(returnedEntry).toEqual(entry);
  });

  it("Should set and get unicode entries correctly", async () => {
    const { publicKey, privateKey } = genKeyPairAndSeed();

    const entry = {
      dataKey,
      data: stringToUint8ArrayUtf8("∂"),
      revision: BigInt(0),
    };

    await client.registry.setEntry(privateKey, entry);

    const { entry: returnedEntry } = await client.registry.getEntry(publicKey, dataKey);
    expect(returnedEntry).not.toBeNull();

    expect(returnedEntry).toEqual(entry);
  });

  it("Should set and get an entry with empty data correctly", async () => {
    const { publicKey, privateKey } = genKeyPairAndSeed();

    const entry = {
      dataKey,
      data: new Uint8Array(),
      revision: BigInt(0),
    };

    await client.registry.setEntry(privateKey, entry);

    const { entry: returnedEntry } = await client.registry.getEntry(publicKey, dataKey);
    expect(returnedEntry).not.toBeNull();

    expect(returnedEntry).toEqual(entry);
  });

  it("Should fail to set an entry with a revision number that's too low", async () => {
    const { privateKey } = genKeyPairAndSeed();

    const entry = {
      dataKey,
      data: new Uint8Array(),
      revision: BigInt(1),
    };

    await client.registry.setEntry(privateKey, entry);
    entry.revision--;
    await expect(client.registry.setEntry(privateKey, entry)).rejects.toThrowError(
      "Unable to update the registry: provided revision number is invalid"
    );
  });
});
