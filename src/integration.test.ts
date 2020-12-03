import { genKeyPairAndSeed, SkynetClient } from "./index";
import { MAX_REVISION } from "./utils";

// TODO: Use siasky.dev when available.
const client = new SkynetClient("https://siasky.net");

const dataKey = "HelloWorld";

// Used to verify end-to-end flow.
describe("SkyDB end to end integration tests", () => {
  it("Should set and get new entries", async () => {
    const { publicKey, privateKey } = genKeyPairAndSeed();
    const json = { data: "thisistext" };

    // Set the file in the SkyDB.
    await client.db.setJSON(privateKey, dataKey, json);

    // get the file in the SkyDB
    const actual = await client.db.getJSON(publicKey, dataKey);
    expect(actual.data).toEqual(json);
    // Revision should be 0.
    expect(actual.revision).toEqual(BigInt(0));
  });

  it("Should set and get entries with the revision at the max allowed", async () => {
    const { publicKey, privateKey } = genKeyPairAndSeed();
    const json = { data: "testnumber2" };

    await client.db.setJSON(privateKey, dataKey, json, MAX_REVISION);

    const actual = await client.db.getJSON(publicKey, dataKey);
    expect(actual.data).toEqual(json);
    expect(actual.revision).toEqual(MAX_REVISION);
  });

  it("Try setting the revision higher than the uint64 max", async () => {
    const { privateKey } = genKeyPairAndSeed();
    const json = { data: "testnumber3" };
    const largeint = MAX_REVISION + BigInt(1);

    await expect(client.db.setJSON(privateKey, dataKey, json, largeint)).rejects.toThrowError(
      "Argument 18446744073709551616 does not fit in a 64-bit unsigned integer; exceeds 2^64-1"
    );
  });
});

describe("Registry end to end integration tests", () => {
  it("Should timeout after the given timeout time in ms", async () => {
    const { publicKey } = genKeyPairAndSeed();

    // Try getting an inexistant entry.
    const { entry, signature } = await client.registry.getEntry(publicKey, "foo");

    expect(entry).toBeNull();
    expect(signature).toBeNull();
  });
});
