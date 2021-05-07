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
    [paths[0], [43,102,13,97,149,88,17,173,153,46,216,18,104,239,79,99,224,85,137,111,14,97,190,91,184,34,129,109,28,59,16,76,199,46,121,154,233,28,123,62,179,218,126,166,225,46,53,44,31,248,119,21,182,161,172,0,211,155,129,85,33,203,117,14]],
    [paths[1], [28,80,111,253,177,165,196,201,14,82,208,135,0,180,162,4,34,118,240,222,154,204,123,81,111,171,22,167,87,30,197,106,233,47,229,10,241,137,161,157,61,104,129,162,102,190,136,116,70,69,233,117,138,147,43,214,109,95,88,60,16,13,35,228]],
    [paths[2], [138,44,141,189,8,239,102,100,200,39,26,181,102,48,152,234,177,88,136,114,184,64,241,121,15,181,185,229,216,145,109,76,121,147,209,166,111,222,110,103,190,29,194,20,18,246,15,30,146,173,135,72,172,122,200,12,116,141,112,151,221,151,112,180]],
  ];

  it.each(pathHashes)("path '%s' should be hashed correctly to %s", (path, hash) => {
    const receivedHash = hashPathComponent(path);
    expect(receivedHash).toEqualUint8Array(new Uint8Array(hash));
  });
});

describe("deriveDiscoverableTweak", () => {
  // prettier-ignore
  const expectedDbt = [174,95,63,225,93,96,12,224,133,225,76,40,165,28,56,238,11,23,217,94,14,11,139,91,236,217,27,238,60,80,218,220,132,138,201,46,94,175,218,38,251,3,185,21,24,112,250,81,112,188,197,122,212,237,245,187,209,80,219,200,135,9,182,166];

  it("should correctly derive the dbt", () => {
    const dataKey = deriveDiscoverableTweak(fullPath);
    const tweak = hexToUint8Array(dataKey);
    expect(tweak).toEqualUint8Array(new Uint8Array(expectedDbt));
  });
});

describe("fully encoded DBT", () => {
  it("should correctly encode the dbt", () => {
    // prettier-ignore
    const expectedEncoding = [1,43,102,13,97,149,88,17,173,153,46,216,18,104,239,79,99,224,85,137,111,14,97,190,91,184,34,129,109,28,59,16,76,199,46,121,154,233,28,123,62,179,218,126,166,225,46,53,44,31,248,119,21,182,161,172,0,211,155,129,85,33,203,117,14,28,80,111,253,177,165,196,201,14,82,208,135,0,180,162,4,34,118,240,222,154,204,123,81,111,171,22,167,87,30,197,106,233,47,229,10,241,137,161,157,61,104,129,162,102,190,136,116,70,69,233,117,138,147,43,214,109,95,88,60,16,13,35,228,138,44,141,189,8,239,102,100,200,39,26,181,102,48,152,234,177,88,136,114,184,64,241,121,15,181,185,229,216,145,109,76,121,147,209,166,111,222,110,103,190,29,194,20,18,246,15,30,146,173,135,72,172,122,200,12,116,141,112,151,221,151,112,180];

    const dbt = new DiscoverableBucketTweak(fullPath);
    const encoding = dbt.encode();
    expect(new Uint8Array(expectedEncoding)).toEqualUint8Array(encoding);
  });
});
