import { genKeyPairAndSeed, SkynetClient } from "./index";

const { publicKey, privateKey } = genKeyPairAndSeed();
const client = new SkynetClient("https://siasky.dev");

const datakey = "HelloWorld";

// skip - used to verify end-to-end flow
describe.skip("siasky.dev end to end integration test", () => {
  it("should be able to both setJSON and getJSON", async () => {
    // Set and get a new entry (revision should be 0).

    let json = { data: "thisistext" };

    // Set the file in the SkyDB.
    await client.db.setJSON(privateKey, datakey, json);

    // get the file in the SkyDB
    let actual = await client.db.getJSON(publicKey, datakey);
    expect(actual.data).toEqual(json);
    expect(actual.revision).toEqual(BigInt(0));

    // Set the revision to the max allowed.

    const maxint = BigInt("18446744073709551615"); // max uint64
    json = { data: "testnumber2" };

    await client.db.setJSON(privateKey, datakey, json, maxint);

    actual = await client.db.getJSON(publicKey, datakey);
    expect(actual.data).toEqual(json);
    expect(actual.revision).toEqual(maxint);
  });
});
