import { combineStrings, randomUnicodeString } from "./testing";

describe("combineStrings", () => {
  it("should permute the given strings from each input string array", () => {
    const inputStringArrays = [
      ["a", "b"],
      ["x", "y"],
      ["1", "2"],
    ];
    const expectedPermutations: string[] = ["ax1", "ax2", "ay1", "ay2", "bx1", "bx2", "by1", "by2"];

    const permutations = combineStrings(...inputStringArrays);
    expect(permutations).toEqual(expectedPermutations);
  });
});

describe("randomUnicodeString", () => {
  it("should generate random unicode strings of the given length", () => {
    for (let i = 0; i < 1024; i++) {
      const s = randomUnicodeString(i);
      expect(s.length).toEqual(i);
    }
  });
});
