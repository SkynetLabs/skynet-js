import {} from ".";

describe("toEqualPortalUrl", () => {
  it("Subdomained portal servers should equal main portal", () => {
    expect("https://us-ny-2.siasky.net").toEqualPortalUrl("https://siasky.net");
  });
});
