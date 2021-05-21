import {
  validateBigint,
  validateNumber,
  validateObject,
  validateUint8Array,
  validateUint8ArrayLen,
} from "./validation";

describe("validateBigint", () => {
  it("Should reject non-bigint input", () => {
    expect(() => validateBigint("test", 123, "parameter")).toThrowError(
      "Expected parameter 'test' to be type 'bigint', was '123'"
    );
  });
});

describe("validateNumber", () => {
  it("Should reject non-number input", () => {
    expect(() => validateNumber("test", "123", "parameter")).toThrowError(
      "Expected parameter 'test' to be type 'number', was '123'"
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

describe("validateUint8Array", () => {
  it("Should reject non-byte array input", () => {
    expect(() => validateUint8Array("test", "123", "parameter")).toThrowError(
      "Expected parameter 'test' to be 'Uint8Array', was '123'"
    );
  });
});

describe("validateUint8ArrayLen", () => {
  it("Should reject non-byte array input of wrong length", () => {
    expect(() => validateUint8ArrayLen("test", new Uint8Array(2), "parameter", 3)).toThrowError(
      "Expected parameter 'test' to be 'Uint8Array' of length 3, was length 2, was '0,0'"
    );
  });
});
