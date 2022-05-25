import {
  validateBigint,
  validateBoolean,
  validateInteger,
  validateNumber,
  validateObject,
  validateSkylinkString,
  validateString,
  validateStringLen,
  validateUint8Array,
  validateUint8ArrayLen,
} from "./validation";

describe("validateBigint", () => {
  it("Should reject non-bigint input", () => {
    expect(() => validateBigint("test", 123, "parameter")).toThrowError(
      "Expected parameter 'test' to be type 'bigint', was type 'number', value '123'"
    );
  });

  const cases = [BigInt("9007199254740991"), BigInt("-12345678901234567890")];

  it.each(cases)("Should accept bigint input '%s'", (input) => {
    expect(() => validateBigint("test", input, "parameter")).not.toThrowError();
  });
});

describe("validateBoolean", () => {
  it("Should reject non-boolean input", () => {
    expect(() => validateBoolean("test", 123, "parameter")).toThrowError(
      "Expected parameter 'test' to be type 'boolean', was type 'number', value '123'"
    );
  });

  const cases = [true, false];

  it.each(cases)("Should accept boolean input '%s'", (input) => {
    expect(() => validateBoolean("test", input, "parameter")).not.toThrowError();
  });
});

describe("validateInteger", () => {
  const numberCases = [123.01, 0.5, NaN, -0.5];

  it.each(numberCases)("Should reject non-integer input '%s'", (input) => {
    expect(() => validateInteger("test", input, "parameter")).toThrowError(
      `Expected parameter 'test' to be an integer value, was type '${typeof input}', value '${input}'`
    );
  });

  const nonNumberCases = ["1", "asdf", false];

  it.each(nonNumberCases)("Should reject non-number input '%s'", (input) => {
    expect(() => validateInteger("test", input, "parameter")).toThrowError(
      `Expected parameter 'test' to be type 'number', was type '${typeof input}', value '${input}'`
    );
  });

  const cases = [-137, 0, 168];

  it.each(cases)("Should accept integer input '%s'", (input) => {
    expect(() => validateInteger("test", input, "parameter")).not.toThrowError();
  });
});

describe("validateNumber", () => {
  it("Should reject non-number input", () => {
    expect(() => validateNumber("test", "123", "parameter")).toThrowError(
      "Expected parameter 'test' to be type 'number', was type 'string', value '123'"
    );
  });

  const cases = [-137.2, 0, 168.924];

  it.each(cases)("Should accept number input '%s'", (input) => {
    expect(() => validateNumber("test", input, "parameter")).not.toThrowError();
  });
});

describe("validateObject", () => {
  it("validateObject should catch null input", () => {
    expect(() => validateObject("test", null, "parameter")).toThrowError(
      "Expected parameter 'test' to be non-null, was type 'null'"
    );
  });

  const cases = [{ key: "value" }, { key: { anotherKey: ["value1", "value2"] } }];

  it.each(cases)("Should accept non-null input '%s'", (input) => {
    expect(() => validateObject("test", input, "parameter")).not.toThrowError();
  });
});

describe("validateSkylinkString", () => {
  it("validateSkylinkString should catch invalid skylinks", () => {
    expect(() => validateSkylinkString("skylink", "abc", "parameter")).toThrowError(
      "Expected parameter 'skylink' to be valid skylink of type 'string', was type 'string', value 'abc'"
    );
  });

  const cases = ["AABRKCTb6z9d-C-Hre-daX4-VIB8L7eydmEr8XRphnS8jg"];

  it.each(cases)("Should accept valid skylink '%s'", (input) => {
    expect(() => validateSkylinkString("test", input, "parameter")).not.toThrowError();
  });
});

describe("validateString", () => {
  it("validateString should catch undefined input", () => {
    expect(() => validateString("test", undefined, "parameter")).toThrowError(
      "Expected parameter 'test' to be type 'string', was type 'undefined'"
    );
  });

  const cases = ["sponge", "bob", `${2 ** 2} pants`];

  it.each(cases)("Should accept string input '%s'", (input) => {
    expect(() => validateString("test", input, "parameter")).not.toThrowError();
  });
});

describe("validateStringLen", () => {
  it("Should reject string input of wrong length", () => {
    expect(() => validateStringLen("test", "hello", "parameter", 4)).toThrowError(
      "Expected parameter 'test' to be type 'string' of length 4, was length 5, was type 'string', value 'hello'"
    );
  });

  const cases = ["patrick", "mrKrabs"];

  it.each(cases)("Should accept string input '%s' of length 7", (input) => {
    expect(() => validateStringLen("test", input, "parameter", 7)).not.toThrowError();
  });
});

describe("validateUint8Array", () => {
  it("Should reject non-byte array input", () => {
    expect(() => validateUint8Array("test", "123", "parameter")).toThrowError(
      "Expected parameter 'test' to be type 'Uint8Array', was type 'string', value '123'"
    );
  });

  const cases = [new Uint8Array([17, 45])];

  it.each(cases)("Should accept byte array input '%s'", (input) => {
    expect(() => validateUint8Array("test", input, "parameter")).not.toThrowError();
  });
});

describe("validateUint8ArrayLen", () => {
  it("Should reject byte array input of wrong length", () => {
    expect(() => validateUint8ArrayLen("test", new Uint8Array(2), "parameter", 3)).toThrowError(
      "Expected parameter 'test' to be type 'Uint8Array' of length 3, was length 2, was type 'object', value '0,0'"
    );
  });

  const cases = [new Uint8Array([17, 45])];

  it.each(cases)("Should accept byte array input '%s' of length 2", (input) => {
    expect(() => validateUint8ArrayLen("test", input, "parameter", 2)).not.toThrowError();
  });
});
