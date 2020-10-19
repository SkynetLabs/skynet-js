import { SkynetClient } from "./client";
import { FileType, FileID, User, SkyFile } from "./skydb";
import { Buffer } from "buffer";
import { readData } from "./utils";

const client = new SkynetClient("https://siasky.dev");

const appID = "HelloWorld";
const filename = "hello.txt";
const fileID = new FileID(appID, FileType.PublicUnencrypted, filename);

// skip - used to verify end-to-end flow
describe.skip("siasky.dev end to end", () => {
  it("to update the file in the SkyDB", async () => {
    const user = new User("john.doe@gmail.com", "test1234");
    const file = new File(["thisistext"], filename, { type: "text/plain" });

    // set the file in the SkyDB
    const updated = await client.setFile(user, fileID, new SkyFile(file));
    expect(updated).toBe(true);

    // get the file in the SkyDB
    const actual = await client.getFile(user, fileID);

    // assert the contents of that file
    const text = await readData(actual.file);
    const parts = text.toString().split(",");
    expect(parts.length).toBe(2);
    const buf = Buffer.from(parts[1], "base64");
    expect(buf.toString("ascii")).toEqual("thisistext");
  });
});
