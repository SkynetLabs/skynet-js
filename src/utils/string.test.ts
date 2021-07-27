import { uriHandshakePrefix } from "./url";
import { hexToUint8Array, stringToUint8ArrayUtf8, trimUriPrefix, uint8ArrayToStringUtf8 } from "./string";
import { randomUnicodeString } from "../../utils/testing";

const hnsLink = "doesn";

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

describe("string/bytearray conversions", () => {
  it("should convert to and from valid UTF-8 strings without any loss of data", () => {
    const str = randomUnicodeString(length);

    // Convert between string and array a few times.
    const array = stringToUint8ArrayUtf8(str);
    const str2 = uint8ArrayToStringUtf8(array);
    const array2 = stringToUint8ArrayUtf8(str2);

    expect(str).toEqual(str2);
    expect(array).toEqualUint8Array(array2);
  });
});

describe("hexToUint8Array", () => {
  const hexStrings: Array<[string, number[]]> = [
    ["ff", [255]],
    ["a", [10]],
    ["ff0a", [255, 10]],
  ];

  it.each(hexStrings)("the hex string '%s' should be decoded to %s", (str, array) => {
    const byteArray = hexToUint8Array(str);
    expect(byteArray).toEqualUint8Array(new Uint8Array(array));
  });

  const invalidHexStrings = ["xyz", "aabbzz", ""];

  it.each(invalidHexStrings)("should throw on invalid input '%s'", (str) => {
    expect(() => hexToUint8Array(str)).toThrowError(
      `Expected parameter 'str' to be a hex-encoded string, was type 'string', value '${str}'`
    );
  });
});

describe("trimUriPrefix", () => {
  it("should correctly parse hns prefixed link", () => {
    const validHnsLinkVariations = [
      hnsLink,
      `hns:${hnsLink}`,
      `hns://${hnsLink}`,
      `HNS:${hnsLink}`,
      `HNS://${hnsLink}`,
    ];

    validHnsLinkVariations.forEach((input) => {
      expect(trimUriPrefix(input, uriHandshakePrefix)).toEqual(hnsLink);
    });
  });
});
