import { readFileSync } from "fs";

import {
  checkPaddedBlock,
  decryptJSONFile,
  deriveEncryptedPathKeyEntropy,
  deriveEncryptedPathSeed,
  deriveEncryptedPathTweak,
  encodeEncryptedFileMetadata,
  ENCRYPTED_JSON_RESPONSE_VERSION,
  ENCRYPTION_KEY_LENGTH,
  ENCRYPTION_HIDDEN_FIELD_METADATA_LENGTH,
  ENCRYPTION_NONCE_LENGTH,
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

describe("deriveEncryptedPathKeyEntropy", () => {
  it("Should derive the correct encrypted file key entropy", () => {
    // Hard-code expected value to catch breaking changes.
    const pathSeed = "a".repeat(64);
    const expectedEntropy = [
      145, 247, 132, 82, 184, 94, 1, 97, 214, 174, 84, 50, 40, 0, 247, 144, 106, 110, 227, 25, 193, 138, 249, 233, 32,
      94, 186, 244, 48, 171, 115, 171,
    ];

    const result = deriveEncryptedPathKeyEntropy(pathSeed);

    expect(result).toEqualUint8Array(new Uint8Array(expectedEntropy));
  });
});

describe("deriveEncryptedPathSeed", () => {
  // Hard-code expected value to catch breaking changes.
  const pathSeed = "a".repeat(128);
  const subPath = "path/to/file.json";
  const expectedDirectorySeed =
    "ae6e5be22469f4c6d89d8490906207d70753a06072db3af44c66e35b37c968a2c5457417f1cf099e3630e8255a58208d6a4b32a174c56c74877fef6412d1a02d";
  const expectedFileSeed = "40fb1701ab23fb020358baa5d5a2cba97d2de64c1e1418382ee6623fd9c17995";

  it("should derive the correct encrypted file seed for a file", () => {
    // Derive seed for a file.
    const fileSeed = deriveEncryptedPathSeed(pathSeed, subPath, false);

    expect(fileSeed).toEqual(expectedFileSeed);
  });

  it("should derive the correct encrypted file seed for a directory", () => {
    // Derive seed for a directory.
    const directorySeed = deriveEncryptedPathSeed(pathSeed, subPath, true);

    expect(directorySeed).toEqual(expectedDirectorySeed);
  });

  it("should result in the same path seed when deriving path for directory first", () => {
    // Derive seed for directory first.
    const directorySeed = deriveEncryptedPathSeed(pathSeed, "path/to", true);

    // Derive seed for file.
    const fileSeed = deriveEncryptedPathSeed(directorySeed, "file.json", false);

    expect(fileSeed).toEqual(expectedFileSeed);
  });

  it("should throw for an empty input sub path", () => {
    const pathSeed = "a".repeat(128);
    const subPath = "";

    expect(() => deriveEncryptedPathSeed(pathSeed, subPath, false)).toThrowError("Input subPath '' not a valid path");
  });

  it("should throw for a file path seed", () => {
    const pathSeed = "a".repeat(64);

    expect(() => deriveEncryptedPathSeed(pathSeed, subPath, false)).toThrowError(
      "Expected parameter 'pathSeed' to be a directory path seed of length '128', was type 'string', value 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'"
    );
  });
});

describe("deriveEncryptedPathTweak", () => {
  it("should throw if an invalid seed is provided", () => {
    const seed = "test.hns/foo";

    expect(() => deriveEncryptedPathTweak(seed)).toThrowError(
      "Expected parameter 'pathSeed' to be a valid file or directory path seed of length '64' or '128', was type 'string', value 'test.hns/foo'"
    );
  });

  it("should derive the correct encrypted file tweak", () => {
    // Hard-code expected value to catch breaking changes.
    const pathSeed = "b".repeat(64);
    const expectedTweak = "bf7f0e6566234184541e44ad2b2084ca207132a90a7b927e05fef9d24789caa7";

    const result = deriveEncryptedPathTweak(pathSeed);

    expect(result).toEqual(expectedTweak);
  });
});

const encryptedTestFilePath = "test_data/encrypted-json-file";
const json = { message: "text" };
const metadata = { version: ENCRYPTED_JSON_RESPONSE_VERSION };
const key = new Uint8Array(ENCRYPTION_KEY_LENGTH);
const fileData = new Uint8Array(readFileSync(encryptedTestFilePath));

describe("decryptJSONFile", () => {
  it("Should decrypt the given test data", () => {
    expect(fileData.length).toEqual(4096);

    const result = decryptJSONFile(fileData, key);

    expect(result).toEqual(json);
  });

  it("Should fail to decrypt bad data", () => {
    expect(() => decryptJSONFile(new Uint8Array(4096), key)).toThrowError(
      "Received unrecognized JSON response version '0' in metadata, expected '1'"
    );
  });

  it("Should fail to decrypt data with a corrupted nonce", () => {
    const data = fileData.slice();
    // Increment the first byte of the nonce to corrupt it.
    data[0]++;
    expect(() => decryptJSONFile(data, key)).toThrowError("Could not decrypt given encrypted JSON file");
  });

  it("Should fail to decrypt data with a corrupted metadata", () => {
    const data = fileData.slice();
    // Increment the first byte of the metadata to corrupt it.
    data[ENCRYPTION_NONCE_LENGTH]++;
    expect(() => decryptJSONFile(data, key)).toThrowError(
      "Received unrecognized JSON response version '2' in metadata, expected '1'"
    );
  });

  it("Should fail to decrypt data with corrupted encrypted bytes", () => {
    const data = fileData.slice();
    data[ENCRYPTION_NONCE_LENGTH + ENCRYPTION_HIDDEN_FIELD_METADATA_LENGTH]++;
    expect(() => decryptJSONFile(data, key)).toThrowError("Could not decrypt given encrypted JSON file");
  });

  it("Should fail to decrypt data that was not padded correctly", () => {
    const data = fileData.slice(0, fileData.length - 1);
    expect(data.length).toEqual(4095);
    expect(() => decryptJSONFile(data, key)).toThrowError(
      "Expected parameter 'data' to be padded encrypted data, length was '4095', nearest padded block is '4096'"
    );
  });
});

describe("encryptJSONFile", () => {
  it("Should encrypt json data", () => {
    const result = encryptJSONFile(json, metadata, key);

    expect(result.length).toEqual(4096);
  });
});

describe("encodeEncryptedFileMetadata", () => {
  const versions = [256, -1];

  it.each(versions)("Should fail to encode metadata with invalid version %s", (version) => {
    const metadata = { version };
    expect(() => encodeEncryptedFileMetadata(metadata)).toThrowError(
      `Metadata version '${version}' could not be stored in a uint8`
    );
  });
});

const kib = 1 << 10;
const mib = 1 << 20;
const gib = 1 << 30;

describe("padFileSize", () => {
  const sizes = [
    [1 * kib, 4 * kib],
    [4 * kib, 4 * kib],
    [5 * kib, 8 * kib],
    [105 * kib, 112 * kib],
    [305 * kib, 320 * kib],
    [351 * kib, 352 * kib],
    [352 * kib, 352 * kib],
    [mib, mib],
    [100 * mib, 104 * mib],
    [gib, gib],
    [100 * gib, 104 * gib],
  ];

  it.each(sizes)("Should pad the file size %s to %s", (initialSize, expectedSize) => {
    const size = padFileSize(initialSize);
    expect(size).toEqual(expectedSize);
    expect(checkPaddedBlock(size)).toBeTruthy();
  });

  it("Should throw on a really big number.", () => {
    expect(() => padFileSize(Number.MAX_SAFE_INTEGER)).toThrowError("Could not pad file size, overflow detected.");
  });
});

describe("checkPaddedBlock", () => {
  const sizes: Array<[number, boolean]> = [
    [1 * kib, false],
    [4 * kib, true],
    [5 * kib, false],
    [105 * kib, false],
    [305 * kib, false],
    [351 * kib, false],
    [352 * kib, true],
    [mib, true],
    [100 * mib, false],
    [gib, true],
    [100 * gib, false],
  ];

  it.each(sizes)("checkPaddedBlock(%s) should return %s", (size, isPadded) => {
    expect(checkPaddedBlock(size)).toEqual(isPadded);
  });

  it("Should throw on a really big number.", () => {
    expect(() => checkPaddedBlock(Number.MAX_SAFE_INTEGER)).toThrowError(
      "Could not check padded file size, overflow detected."
    );
  });
});
