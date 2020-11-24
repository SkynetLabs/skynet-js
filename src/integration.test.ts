import { genKeyPairAndSeed, SkynetClient } from "./index";

const { publicKey, privateKey } = genKeyPairAndSeed();
const client = new SkynetClient("https://siasky.dev");

const dataKey = "HelloWorld";

// skip - used to verify end-to-end flow
describe.skip("siasky.dev end to end integration test", () => {
  it("should be able to both setJSON and getJSON", async () => {
    // Set and get a new entry (revision should be 0).

    let json = { data: "thisistext" };

    // Set the file in the SkyDB.
    await client.db.setJSON(privateKey, dataKey, json);

    // get the file in the SkyDB
    let actual = await client.db.getJSON(publicKey, dataKey);
    expect(actual.data).toEqual(json);
    expect(actual.revision).toEqual(BigInt(0));

    // Set the revision to the max allowed.

    const maxint = BigInt("18446744073709551615"); // max uint64
    json = { data: "testnumber2" };

    await client.db.setJSON(privateKey, dataKey, json, maxint);

    actual = await client.db.getJSON(publicKey, dataKey);
    expect(actual.data).toEqual(json);
    expect(actual.revision).toEqual(maxint);

    // Try setting the revision higher than the uint64 max.

    const largeint = maxint + BigInt(1);

    await expect(client.db.setJSON(privateKey, dataKey, json, largeint)).rejects.toThrow();
  });
});
