import { portal } from ".";

describe("toEqualPortalUrl", () => {
  it("Subdomained portal servers should equal main portal", () => {
    expect(portal).toEqualPortalUrl(portal);
    expect("https://us-ny-2.siasky.net").toEqualPortalUrl("https://siasky.net");
    expect("https://siasky.net").toEqualPortalUrl("https://us-ny-2.siasky.net");
    expect("https://dev1.siasky.dev").not.toEqualPortalUrl("https://siasky.net");
    expect("https://siasky.dev").not.toEqualPortalUrl("https://us-ny-2.siasky.net");
  });
});

describe("toEqualUint8Array", () => {
  it("should correctly check whether uint8arrays are equal", () => {
    expect(new Uint8Array([0])).toEqualUint8Array(new Uint8Array([0]));
    expect(new Uint8Array([1, 1, 0])).toEqualUint8Array(new Uint8Array([1, 1, 0]));
    expect(new Uint8Array([1, 0, 0])).not.toEqualUint8Array(new Uint8Array([1, 1, 0]));
    expect(new Uint8Array([1, 1, 0])).not.toEqualUint8Array(new Uint8Array([1, 1, 0, 0]));
  });
});
