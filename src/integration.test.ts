import { keyPairFromSeed, SkynetClient } from "./index";

const { publicKey, privateKey } = keyPairFromSeed(makeSeed(64));
const client = new SkynetClient("https://siasky.dev");

const datakey = "HelloWorld";
const json = { data: "thisistext" };

function makeSeed(length: number) {
  let result = "";
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

// skip - used to verify end-to-end flow
describe.skip("siasky.dev end to end integration test", () => {
  it("should be able to both setJSON and getJSON", async () => {
    // set the file in the SkyDB
    await client.db.setJSON(privateKey, datakey, json);

    // get the file in the SkyDB
    const actual = await client.db.getJSON(publicKey, datakey);
    expect(actual.data).toEqual(json);
    expect(actual.revision).toEqual(0);
  });
});
