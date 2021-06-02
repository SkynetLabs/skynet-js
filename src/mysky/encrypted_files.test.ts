import { padFileSize } from "./encrypted_files";

describe("padFileSize", () => {
  const kib = 1 << 10;
  const sizes = [
    [1 * kib, 4 * kib],
    [4 * kib, 4 * kib],
    [5 * kib, 8 * kib],
    [105 * kib, 112 * kib],
    [305 * kib, 320 * kib],
    [351 * kib, 352 * kib],
    [352 * kib, 352 * kib],
  ];

  it.each(sizes)("Should pad the file size %s to %s", (initialSize, expectedSize) => {
    const size = padFileSize(initialSize);
    expect(size).toEqual(expectedSize);
  });

  it("Should throw on a really big number.", () => {
    expect(() => padFileSize(Number.MAX_SAFE_INTEGER)).toThrowError("Could not pad file size, overflow detected.");
  });
});
