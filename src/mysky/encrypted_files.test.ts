import { readFileSync, writeFileSync } from "fs";

import {
  decryptJSONFile,
  deriveEncryptedFileKeyEntropy,
  deriveEncryptedFileSeed,
  deriveEncryptedFileTweak,
  encodeEncryptedFileMetadata,
  ENCRYPTED_JSON_RESPONSE_VERSION,
  ENCRYPTION_KEY_LENGTH,
  encryptJSONFile,
  padFileSize,
} from "./encrypted_files";

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

describe("deriveEncryptedFileKeyEntropy", () => {
  it("Should derive the correct encrypted file key entropy", () => {
    // Hard-code expected value to catch breaking changes.
    const pathSeed = "a".repeat(64);
    const expectedEntropy = [
      145, 247, 132, 82, 184, 94, 1, 97, 214, 174, 84, 50, 40, 0, 247, 144, 106, 110, 227, 25, 193, 138, 249, 233, 32,
      94, 186, 244, 48, 171, 115, 171,
    ];

    const result = deriveEncryptedFileKeyEntropy(pathSeed);

    expect(result).toEqualUint8Array(new Uint8Array(expectedEntropy));
  });
});

describe("deriveEncryptedFileSeed", () => {
  it("Should derive the correct encrypted file seed", () => {
    // Hard-code expected value to catch breaking changes.
    const pathSeed = "a".repeat(64);
    const subPath = "path/to/file.json";

    // Derive seed for a file.
    const fileSeed = deriveEncryptedFileSeed(pathSeed, subPath, false);

    expect(fileSeed).toEqual(
      "ace80613629a4049386b3007c17aa9aa2a7f86a7649326c03d56eb40df23593bee4a19fc4dcf5118c2cf85649551a780acf07b7b2d13e098612351e59c472bd0"
    );

    // Derive seed for a directory.
    const directorySeed = deriveEncryptedFileSeed(pathSeed, subPath, true);

    expect(directorySeed).toEqual(
      "fa91607af922c9e57d794b7980e550fb15db99e62960fb0908b0f5af10afaf16876b7ac314c1815eb1ca0e51701c11489f08002e8ff3d61c7798bed1c7f016fb"
    );

    expect(fileSeed).not.toEqual(directorySeed);
  });
});

describe("deriveEncryptedFileTweak", () => {
  it("Should derive the correct encrypted file tweak", () => {
    // Hard-code expected value to catch breaking changes.
    const seed = "test.hns/foo";
    const expectedTweak = "352140f347807438f8f74edf3e0750a408f39b9f2ae4147eb9055d396b467fc8";

    const result = deriveEncryptedFileTweak(seed);

    expect(result).toEqual(expectedTweak);
  });
});

const encryptedTestFilePath = "test_data/encrypted-json-file";
const json = { message: "text" };
const v = ENCRYPTED_JSON_RESPONSE_VERSION;
const fullData = { _data: json, _v: v };
const key = new Uint8Array(ENCRYPTION_KEY_LENGTH);

describe("decryptJSONFile", () => {
  it("Should decrypt the given test data", () => {
    const data = new Uint8Array(readFileSync(encryptedTestFilePath));
    expect(data.length).toEqual(4096);

    const result = decryptJSONFile(data, key);

    expect(result).toEqual(fullData);
  });

  it("Should fail to decrypt bad data", () => {
    expect(() => decryptJSONFile(new Uint8Array(4096), key)).toThrowError(
      "Could not decrypt given encrypted JSON file"
    );
  });
});

describe("encryptJSONFile", () => {
  const result = encryptJSONFile(fullData, key);

  expect(result.length).toEqual(4096);

  writeFileSync(encryptedTestFilePath, result);
});

describe("encodeEncryptedFileMetadata", () => {
  it("Should fail to encode metadata with an invalid version", () => {
    const version = 256;
    const metadata = { version };
    expect(() => encodeEncryptedFileMetadata(metadata)).toThrowError(
      `Metadata version '${version}' could not be stored in a uint8`
    );
  });
});

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
