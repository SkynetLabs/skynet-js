import { encodeBigintAsUint64, encodeNumber, encodeUtf8String } from "./encoding";
import { MAX_REVISION } from "./number";

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

describe("toEqualUint8Array", () => {
  it("should correctly check whether uint8arrays are equal", () => {
    expect(new Uint8Array([0])).toEqualUint8Array(new Uint8Array([0]));
    expect(new Uint8Array([1, 1, 0])).toEqualUint8Array(new Uint8Array([1, 1, 0]));
    expect(new Uint8Array([1, 0, 0])).not.toEqualUint8Array(new Uint8Array([1, 1, 0]));
    expect(new Uint8Array([1, 1, 0])).not.toEqualUint8Array(new Uint8Array([1, 1, 0, 0]));
  });
});

describe("encodeBigint", () => {
  const bigints: Array<[bigint, number[]]> = [
    [BigInt(0), [0, 0, 0, 0, 0, 0, 0, 0]],
    [BigInt(255), [255, 0, 0, 0, 0, 0, 0, 0]],
    [BigInt(256), [0, 1, 0, 0, 0, 0, 0, 0]],
    [MAX_REVISION, [255, 255, 255, 255, 255, 255, 255, 255]],
  ];

  it.each(bigints)("should correctly encode bigint %s as %s", (input, encoding) => {
    expect(encodeBigintAsUint64(input)).toEqualUint8Array(new Uint8Array(encoding));
  });

  it("should throw if the bigint is beyond the max revision allowed", () => {
    expect(() => encodeBigintAsUint64(MAX_REVISION + BigInt(1))).toThrowError(
      "Argument 18446744073709551616 does not fit in a 64-bit unsigned integer; exceeds 2^64-1"
    );
  });
});

describe("encodeNumber", () => {
  const numbers: Array<[number, number[]]> = [
    [0, [0, 0, 0, 0, 0, 0, 0, 0]],
    [1, [1, 0, 0, 0, 0, 0, 0, 0]],
    [255, [255, 0, 0, 0, 0, 0, 0, 0]],
    [256, [0, 1, 0, 0, 0, 0, 0, 0]],
  ];

  it.each(numbers)("should correctly encode number %s as %s", (input, encoding) => {
    expect(encodeNumber(input)).toEqualUint8Array(new Uint8Array(encoding));
  });
});

describe("encodeUtf8String", () => {
  const strings: Array<[string, number[]]> = [
    ["", [0, 0, 0, 0, 0, 0, 0, 0]],
    ["skynet", [6, 0, 0, 0, 0, 0, 0, 0, 115, 107, 121, 110, 101, 116]],
  ];

  it.each(strings)("should correctly encode string %s as %s", (input, encoding) => {
    expect(encodeUtf8String(input)).toEqualUint8Array(new Uint8Array(encoding));
  });
});
