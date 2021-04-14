import { deriveDiscoverableTweak } from "../mysky/tweak";
import { uriHandshakePrefix, uriHandshakeResolverPrefix } from "./skylink";
import { hexToUint8Array, stringToUint8Array, toHexString, trimUriPrefix, uint8ArrayToString } from "./string";

const hnsLink = "doesn";
const hnsresLink = "doesn";

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
      `Expected parameter 'str' to be a hex-encoded string, was '${str}'`
    );
  });
});

describe("stringToUint8Array", () => {
  it("Should work for mySky.setJSON paths", () => {
    const path = "localhost/cert";
    const expected =
      "efbfbd086e5aefbfbd2fdfb83335efbfbdefbfbdefbfbd623439efbfbdefbfbd5d75efbfbd02efbfbd69efbfbdefbfbd1befbfbd1fefbfbd";

    const dataKey = deriveDiscoverableTweak(path);
    const input = uint8ArrayToString(dataKey);
    const hash = toHexString(stringToUint8Array(input));
    expect(hash).toEqual(expected);
  });
});

describe("trimUriPrefix", () => {
  it("should correctly parse hns prefixed link", () => {
    const validHnsLinkVariations = [hnsLink, `hns:${hnsLink}`, `hns://${hnsLink}`];
    const validHnsresLinkVariations = [hnsresLink, `hnsres:${hnsresLink}`, `hnsres://${hnsresLink}`];

    validHnsLinkVariations.forEach((input) => {
      expect(trimUriPrefix(input, uriHandshakePrefix)).toEqual(hnsLink);
    });
    validHnsresLinkVariations.forEach((input) => {
      expect(trimUriPrefix(input, uriHandshakeResolverPrefix)).toEqual(hnsresLink);
    });
  });
});
