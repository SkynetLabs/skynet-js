import { combineArrays, combineStrings, randomUnicodeString } from "./testing";

describe("combineArrays", () => {
  it("should permute the given arrays from each input array of arrays", () => {
    const inputArrays = [
      ["a", "b"],
      ["x", "y"],
      ["1", "2"],
    ];
    const expectedPermutations = [
      ["a", "x", "1"],
      ["a", "x", "2"],
      ["a", "y", "1"],
      ["a", "y", "2"],
      ["b", "x", "1"],
      ["b", "x", "2"],
      ["b", "y", "1"],
      ["b", "y", "2"],
    ];

    const permutations = combineArrays(...inputArrays);
    expect(permutations).toEqual(expectedPermutations);
  });
});

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
    for (let i = 0; i < 32; i++) {
      const s = randomUnicodeString(i);
      expect(s.length).toEqual(i);
    }
  });
});
