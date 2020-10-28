import { SkynetClient } from "./client";
import { pki } from "node-forge";

const { publicKey, privateKey } = pki.ed25519.generateKeyPair();
const client = new SkynetClient("https://siasky.dev");

const datakey = "HelloWorld";
const json = { data: "thisistext" };

// skip - used to verify end-to-end flow
describe.skip("siasky.dev end to end integration test", () => {
  it("should be able to both setJSON and getJSON", async () => {
    // set the file in the SkyDB
    await client.db.setJSON(privateKey, datakey, json);

    // get the file in the SkyDB
    const actual = await client.db.getJSON(publicKey, datakey);
    expect(actual).toEqual(json);
  });
});
