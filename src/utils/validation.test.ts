import { validateBigint, validateObject } from "./validation";

describe("validateBigint", () => {
  it("validateBigint should catch non-bigint input", () => {
    expect(() => validateBigint("test", 123, "parameter")).toThrowError(
      "Expected parameter 'test' to be type 'bigint', was '123'"
    );
  });
});

describe("validateObject", () => {
  it("validateObject should catch null input", () => {
    expect(() => validateObject("test", null, "parameter")).toThrowError(
      "Expected parameter 'test' to be non-null, was 'null'"
    );
  });
});
