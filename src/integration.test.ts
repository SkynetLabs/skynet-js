import { genKeyPairAndSeed, SkynetClient } from "./index";

const client = new SkynetClient("https://siasky.dev");

const dataKey = "HelloWorld";
const maxint = BigInt("18446744073709551615"); // max uint64

// skip - used to verify end-to-end flow
describe.skip("siasky.dev end to end integration test", () => {
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

    await client.db.setJSON(privateKey, dataKey, json, maxint);

    const actual = await client.db.getJSON(publicKey, dataKey);
    expect(actual.data).toEqual(json);
    expect(actual.revision).toEqual(maxint);
  });

  it("Try setting the revision higher than the uint64 max", async () => {
    const { privateKey } = genKeyPairAndSeed();
    const json = { data: "testnumber3" };
    const largeint = maxint + BigInt(1);

    await expect(client.db.setJSON(privateKey, dataKey, json, largeint)).rejects.toThrowError(
      "Argument 18446744073709551616 does not fit in a 64-bit unsigned integer; exceeds 2^64-1"
    );
  });
});
