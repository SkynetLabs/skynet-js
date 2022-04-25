import { client, dataKey, portal } from ".";
import { uploadBlocking } from "../src/utils/upload";

describe(`pinSkylink for portal '${portal}'`, () => {
  const fileData = "testing";

  it("Should call the actual pin endpoint and get the skylink from the headers", async () => {
    // Upload the data to acquire its skylink.

    const file = new File([fileData], dataKey);
    const skylink = await uploadBlocking(() => client.uploadFile(file), client);
    expect(skylink).not.toEqual("");

    const { skylink: skylink2 } = await client.pinSkylink(skylink);

    expect(skylink2).toEqual(skylink);
  });
});
