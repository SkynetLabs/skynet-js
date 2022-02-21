import { client, portal } from ".";
import { genKeyPairAndSeed, URI_SKYNET_PREFIX } from "../src";

describe(`FileV2 API integration tests for portal '${portal}'`, () => {
  const userID = "89e5147864297b80f5ddf29711ba8c093e724213b0dcbefbc3860cc6d598cc35";
  const path = "snew.hns/asdf";

  it("Should get existing FileV2 API JSON data", async () => {
    const expected = { name: "testnames" };

    const { data: received } = await client.fileV2.getJSON(userID, path);
    expect(received).toEqual(expect.objectContaining(expected));
  });

  it("Should get existing FileV2 API entry data", async () => {
    const expected = new Uint8Array([
      65, 65, 67, 116, 77, 77, 114, 101, 122, 76, 56, 82, 71, 102, 105, 98, 104, 67, 53, 79, 98, 120, 48, 83, 102, 69,
      106, 48, 77, 87, 108, 106, 95, 112, 55, 97, 95, 77, 107, 90, 85, 81, 45, 77, 57, 65,
    ]);

    const { data: received } = await client.fileV2.getEntryData(userID, path);
    expect(received).toEqualUint8Array(expected);
  });

  it("getEntryData should return null for non-existent FileV2 API entry data", async () => {
    const { publicKey: userID } = genKeyPairAndSeed();
    const { data: received } = await client.fileV2.getEntryData(userID, path);
    expect(received).toBeNull();
  });

  it("Should get an existing entry link for a user ID and path", async () => {
    const expected = `${URI_SKYNET_PREFIX}AQAKDRJbfAOOp3Vk8L-cjuY2d34E8OrEOy_PTsD0xCkYOQ`;

    const entryLink = await client.fileV2.getEntryLink(userID, path);
    expect(entryLink).toEqual(expected);
  });
});
