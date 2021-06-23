import { defaultSkynetPortalUrl, uriSkynetPrefix, SkynetClient } from "./index";

const portalUrl = defaultSkynetPortalUrl;
const client = new SkynetClient(portalUrl);

describe("getEntryLink", () => {
  it("Should get the entry link for a user ID and path", async () => {
    const userID = "89e5147864297b80f5ddf29711ba8c093e724213b0dcbefbc3860cc6d598cc35";
    const path = "snew.hns/asdf";
    const expected = `${uriSkynetPrefix}AQAKDRJbfAOOp3Vk8L-cjuY2d34E8OrEOy_PTsD0xCkYOQ`;

    const entryLink = await client.file.getEntryLink(userID, path);
    expect(entryLink).toEqual(expected);
  });
});
