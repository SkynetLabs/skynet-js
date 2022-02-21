import { ensureUrl } from "skynet-mysky-utils";

import { client, portal } from ".";

describe(`initPortalUrl for portal '${portal}'`, () => {
  it("Calling initPortalUrl after providing a custom portal URL should have no effect", async () => {
    const portalUrl1 = await client.portalUrl();
    expect(portalUrl1).toEqual(ensureUrl(portal));

    await client.initPortalUrl();

    const portalUrl2 = await client.portalUrl();
    expect(portalUrl2).toEqual(ensureUrl(portal));
  });
});
