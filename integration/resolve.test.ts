import { client, portal } from ".";
import { URI_SKYNET_PREFIX } from "../src";

describe(`resolveHns for portal '${portal}'`, () => {
  it("Should resolve an HNS name with an underlying skyns link to a skylink", async () => {
    // Use an HNS we own that we don't plan on changing soon.
    const domain = "mayonnaise";
    const expectedEntryLink = `${URI_SKYNET_PREFIX}AQDwh1jnoZas9LaLHC_D4-2yP9XYDdZzNtz62H4Dww1jDA`;
    const dataKey = "43c8a9b01609544ab152dad397afc3b56c1518eb546750dbc6cad5944fec0292";
    const publicKey = "cbf97df45c9f166e893e164be714a4aee840d3a421f66e52f6b9e2a5009cfabc";
    const expectedData = {
      registry: {
        publickey: `ed25519:${publicKey}`,
        datakey: dataKey,
      },
    };

    const { data, skylink } = await client.resolveHns(domain);

    expect(skylink).toEqual(expectedEntryLink);
    expect(data).toEqual(expectedData);
  });
});
