import { ensureUrl } from "skynet-mysky-utils";

import { client, portal, skynetApiKey } from ".";

describe(`initPortalUrl for portal '${portal}'`, () => {
  it("Calling initPortalUrl after providing a custom portal URL should have no effect", async () => {
    const portalUrl1 = await client.portalUrl();
    expect(portalUrl1).toEqual(ensureUrl(portal));

    await client.initPortalUrl();

    const portalUrl2 = await client.portalUrl();
    expect(portalUrl2).toEqual(ensureUrl(portal));
  });
});

describe(`ro-tex`, () => {
  it("dumps env vars", async () => {
    console.log(" >>> portal:", portal);
    console.log(" >>> skynetApiKey:", skynetApiKey);
    console.log(" >>> SKYNET_JS_INTEGRATION_TEST_SERVER:", process.env.SKYNET_JS_INTEGRATION_TEST_SERVER);
    console.log(
      " >>> SKYNET_JS_INTEGRATION_TEST_SKYNET_API_KEY:",
      process.env.SKYNET_JS_INTEGRATION_TEST_SKYNET_API_KEY
    );
    console.log(" >>> SKYNET_API_KEY:", process.env.SKYNET_API_KEY);

    expect(1).toEqual(2);
  });
});
