import { hexToUint8Array, toHexString } from "../utils/string";
import { newEd25519PublicKey, newSkylinkV2, newSpecifier, SiaSkylink } from "./sia";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toEqualUint8Array(argument: Uint8Array): R;
    }
  }
}

expect.extend({
  // source https://stackoverflow.com/a/60818105/6085242
  toEqualUint8Array(received: Uint8Array, argument: Uint8Array) {
    if (received.length !== argument.length) {
      return { pass: false, message: () => `expected ${received} to equal ${argument}` };
    }
    for (let i = 0; i < received.length; i++) {
      if (received[i] !== argument[i]) {
        return { pass: false, message: () => `expected ${received} to equal ${argument}` };
      }
    }
    return { pass: true, message: () => `expected ${received} not to equal ${argument}` };
  },
});

describe("newSpecifier", () => {
  it("should return correct specifier for given string", () => {
    const specifier = "testing";
    const expected = new Uint8Array([116, 101, 115, 116, 105, 110, 103, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(newSpecifier(specifier)).toEqualUint8Array(expected);
  });
});

describe("newSkylinkV2", () => {
  it("should create v2 skylinks correctly", () => {
    // Hard-code expected data from skyd.
    const publicKey = "a1790331b8b41a94644d01a7b482564e7049047812364bcabc32d399ad23f7e2";
    const dataKey = "d321b3c31337047493c9b5a99675e9bdaea44218a31aad2fd7738209e7a5aca1";
    const expectedSkylink = "AQB7zHVDtD-PikoAD_0zzFbWWPcY-IJoJRHXFJcwoU-WvQ";

    const siaPublicKey = newEd25519PublicKey(publicKey);
    const skylink = newSkylinkV2(siaPublicKey, hexToUint8Array(dataKey));

    expect(skylink.toString()).toEqual(expectedSkylink);
  });
});

describe("SiaSkylink.toString", () => {
  const skylinks = [
    [
      new SiaSkylink(1, hexToUint8Array("a0db12bf2960b0c989d5f64bedd3c9c16d5c0ed3430af411d0d0db3de4938ef2")),
      "AQCg2xK_KWCwyYnV9kvt08nBbVwO00MK9BHQ0Ns95JOO8g",
    ],
    [
      new SiaSkylink(1, hexToUint8Array("fda409fe5fb07b52647bf21f092b1748f34e1fc01ae269bcc743e0b10dbff12a")),
      "AQD9pAn-X7B7UmR78h8JKxdI804fwBriabzHQ-CxDb_xKg",
    ],
  ];

  it.each(skylinks)("should convert the skylink %s to string %s", (skylink, str) => {
    expect(skylink.toString()).toEqual(str);
  });
});
