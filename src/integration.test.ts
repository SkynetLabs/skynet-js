import { SkynetClient } from "./client";
// import { Buffer } from "buffer";
import { pki } from "node-forge";
// import { readData } from "./utils";

const { publicKey, privateKey } = pki.ed25519.generateKeyPair();
const client = new SkynetClient("https://siasky.dev");

const appID = "HelloWorld";
const json = { data: "thisistext" };

// skip - used to verify end-to-end flow
describe.skip("siasky.dev end to end", () => {
  it("to update the file in the SkyDB", async () => {
    // set the file in the SkyDB
    await client.db.setJSON(privateKey, appID, json);

    // get the file in the SkyDB
    const actual = await client.db.getJSON(publicKey, appID);

    expect(actual).toEqual(json);
  });
});
