import { hexToUint8Array } from "../utils/string";
import { deriveDiscoverableTweak, DiscoverableBucketTweak, hashPathComponent, splitPath } from "./tweak";

const fullPath = "skyfeed.hns/preferences/ui.json";
const paths = ["skyfeed.hns", "preferences", "ui.json"];

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

describe("splitPath", () => {
  it("splitPath should split the path correctly", () => {
    const receivedPaths = splitPath(fullPath);
    expect(receivedPaths).toEqual(paths);
  });
});

describe("path hashes", () => {
  // prettier-ignore
  const pathHashes: Array<[string, number[]]> = [
    [paths[0], [51, 167, 30, 159, 125, 56, 105, 160, 29, 147, 178, 185, 97, 129, 100, 44, 39, 130, 248, 221, 74, 202, 53, 40, 86, 42, 24, 19, 74, 16, 179, 193]],
    [paths[1], [49, 88, 82, 205, 55, 45, 202, 7, 157, 7, 173, 166, 123, 131, 10, 196, 194, 13, 141, 206, 37, 91, 4, 190, 100, 191, 107, 123, 214, 6, 160, 221]],
    [paths[2], [46, 4, 188, 144, 182, 185, 156, 100, 51, 181, 155, 119, 152, 105, 130, 186, 253, 138, 155, 18, 98, 173, 11, 70, 41, 138, 162, 119, 46, 113, 68, 59]],
  ];

  it.each(pathHashes)("path '%s' should be hashed correctly to %s", (path, hash) => {
    const receivedHash = hashPathComponent(path);
    expect(receivedHash).toEqualUint8Array(new Uint8Array(hash));
  });
});

describe("deriveDiscoverableTweak", () => {
  // prettier-ignore
  const expectedDbt = [196, 18, 90, 152, 134, 166, 231, 11, 39, 197, 25, 28, 19, 221, 214, 197, 216, 8, 7, 142, 230, 239, 128, 193, 47, 26, 48, 226, 142, 150, 72, 225];

  it("should correctly derive the dbt", () => {
    const dataKey = deriveDiscoverableTweak(fullPath);
    const tweak = hexToUint8Array(dataKey);
    expect(tweak).toEqualUint8Array(new Uint8Array(expectedDbt));
  });
});

describe("fully encoded DBT", () => {
  it("should correctly encode the dbt", () => {
    // prettier-ignore
    const expectedEncoding = [1, 51, 167, 30, 159, 125, 56, 105, 160, 29, 147, 178, 185, 97, 129, 100, 44, 39, 130, 248, 221, 74, 202, 53, 40, 86, 42, 24, 19, 74, 16, 179, 193, 49, 88, 82, 205, 55, 45, 202, 7, 157, 7, 173, 166, 123, 131, 10, 196, 194, 13, 141, 206, 37, 91, 4, 190, 100, 191, 107, 123, 214, 6, 160, 221, 46, 4, 188, 144, 182, 185, 156, 100, 51, 181, 155, 119, 152, 105, 130, 186, 253, 138, 155, 18, 98, 173, 11, 70, 41, 138, 162, 119, 46, 113, 68, 59];

    const dbt = new DiscoverableBucketTweak(fullPath);
    const encoding = dbt.encode();
    expect(new Uint8Array(expectedEncoding)).toEqualUint8Array(encoding);
  });
});
