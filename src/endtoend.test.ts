import { SkynetClient } from "./client";
import { EncodeUserPublicKey } from "./crypto";
import { FileType, NewFileID, SkyFile, User } from "./skydb";

const client = new SkynetClient("https://siasky.dev");

const appID = "HelloWorld";
const filename = "hello.txt";
const fileID = NewFileID(appID, FileType.PublicUnencrypted, filename);

describe("SkyDB EndToEnd", () => {
  it("should work", async () => {
    const user = User.New("peterjan.brone@gmail.com", "test1234");
    const file = new File(["thisistext"], filename, { type: "text/plain" });
    await client.setFile(user, fileID, SkyFile.New(file));
  });

  it("should encode a user id", async () => {
    const user = User.New("peterjan.brone@gmail.com", "test1234");
    const enc = EncodeUserPublicKey(user);
    console.log(enc);
  });
});
