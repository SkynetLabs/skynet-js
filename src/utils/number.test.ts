import { assertUint64, MAX_REVISION } from "./number";

describe("assertUint64", () => {
  it("should test the assertUint64 function", () => {
    expect(() => assertUint64(BigInt(0))).not.toThrow();
    expect(() => assertUint64(BigInt(-1))).toThrow();
    expect(() => assertUint64(MAX_REVISION)).not.toThrow();
    expect(() => assertUint64(MAX_REVISION + BigInt(1))).toThrow();
  });
});
