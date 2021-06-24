import { extractOptions } from "./options";

describe("extractOptions", () => {
  it("Should throw if the given options are missing a property", () => {
    const opts = { bar: 2 };
    const model = { foo: 1, bar: 2 };
    expect(() => extractOptions(opts, model)).toThrowError("Property 'foo' not found");
  });
});
