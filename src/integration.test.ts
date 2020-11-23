import { genKeyPairAndSeed, SkynetClient } from "./index";

const { publicKey, privateKey } = genKeyPairAndSeed();
const client = new SkynetClient("https://siasky.net");

const datakey = "HelloWorld";
const json = { data: "thisistext" };

// skip - used to verify end-to-end flow
describe("siasky.dev end to end integration test", () => {
  it("should be able to both setJSON and getJSON", async () => {
    // set the file in the SkyDB
    await client.db.setJSON(privateKey, datakey, json);

    // get the file in the SkyDB
    const actual = await client.db.getJSON(publicKey, datakey);
    expect(actual.data).toEqual(json);
    expect(actual.revision).toEqual(0);
  });
});
