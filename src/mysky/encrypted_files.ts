import randomBytes from "randombytes";
import { sanitizePath } from "skynet-mysky-utils";
import { secretbox } from "tweetnacl";

import { HASH_LENGTH, sha512 } from "../crypto";
import { hexToUint8Array, stringToUint8ArrayUtf8, toHexString, uint8ArrayToStringUtf8 } from "../utils/string";
import { JsonData } from "../utils/types";
import {
  throwValidationError,
  validateBoolean,
  validateHexString,
  validateNumber,
  validateObject,
  validateString,
  validateUint8Array,
  validateUint8ArrayLen,
} from "../utils/validation";

/**
 * The current response version for encrypted JSON files. Part of the metadata
 * prepended to encrypted data.
 */
export const ENCRYPTED_JSON_RESPONSE_VERSION = 1;

/**
 * The length of the encryption key.
 */
export const ENCRYPTION_KEY_LENGTH = 32;

/**
 * The length of the hidden field metadata stored along with encrypted files.
 * Note that this is hidden from the user, but not actually encrypted. It is
 * stored after the nonce.
 */
export const ENCRYPTION_HIDDEN_FIELD_METADATA_LENGTH = 16;

/**
 * The length of the random nonce, prepended to the encrypted bytes. It comes
 * before the unencrypted hidden field metadata.
 */
export const ENCRYPTION_NONCE_LENGTH = 24;

/**
 * The length of the overhead introduced by encryption.
 */
const ENCRYPTION_OVERHEAD_LENGTH = 16;

/**
 * The length of the hex-encoded share-able directory path seed.
 */
export const ENCRYPTION_PATH_SEED_DIRECTORY_LENGTH = 128;

/**
 * The length of the hex-encoded share-able file path seed.
 */
export const ENCRYPTION_PATH_SEED_FILE_LENGTH = 64;

// Descriptive salt that should not be changed.
const SALT_ENCRYPTED_CHILD = "encrypted filesystem child";

// Descriptive salt that should not be changed.
const SALT_ENCRYPTED_TWEAK = "encrypted filesystem tweak";

// Descriptive salt that should not be changed.
const SALT_ENCRYPTION = "encryption";

export type EncryptedJSONResponse = {
  data: JsonData | null;
};

type DerivationPathObject = {
  pathSeed: Uint8Array;
  directory: boolean;
  name: string;
};

type EncryptedFileMetadata = {
  // 8-bit uint.
  version: number;
};

/**
 * Decrypts the given bytes as an encrypted JSON file.
 *
 * @param data - The given raw bytes.
 * @param key - The encryption key.
 * @returns - The JSON data and metadata.
 * @throws - Will throw if the bytes could not be decrypted.
 */
export function decryptJSONFile(data: Uint8Array, key: Uint8Array): JsonData {
  validateUint8Array("data", data, "parameter");
  validateUint8ArrayLen("key", key, "parameter", ENCRYPTION_KEY_LENGTH);

  // Validate that the size of the data corresponds to a padded block.
  if (!checkPaddedBlock(data.length)) {
    throw new Error(
      `Expected parameter 'data' to be padded encrypted data, length was '${
        data.length
      }', nearest padded block is '${padFileSize(data.length)}'`
    );
  }

  // Extract the nonce.
  const nonce = data.slice(0, ENCRYPTION_NONCE_LENGTH);
  data = data.slice(ENCRYPTION_NONCE_LENGTH);

  // Extract the unencrypted hidden field metadata.
  const metadataBytes = data.slice(0, ENCRYPTION_HIDDEN_FIELD_METADATA_LENGTH);
  data = data.slice(ENCRYPTION_HIDDEN_FIELD_METADATA_LENGTH);
  const metadata = decodeEncryptedFileMetadata(metadataBytes);
  if (metadata.version !== ENCRYPTED_JSON_RESPONSE_VERSION) {
    throw new Error(
      `Received unrecognized JSON response version '${metadata.version}' in metadata, expected '${ENCRYPTED_JSON_RESPONSE_VERSION}'`
    );
  }

  // Decrypt the non-nonce part of the data.
  let decryptedBytes = secretbox.open(data, nonce, key);
  if (!decryptedBytes) {
    throw new Error("Could not decrypt given encrypted JSON file");
  }

  // Trim the 0-byte padding off the end of the decrypted bytes. This should never remove real data as
  // properly-formatted JSON must end with '}'.
  let paddingIndex = decryptedBytes.length;
  while (paddingIndex > 0 && decryptedBytes[paddingIndex - 1] === 0) {
    paddingIndex--;
  }
  decryptedBytes = decryptedBytes.slice(0, paddingIndex);

  // Parse the final decrypted message as json.
  return JSON.parse(uint8ArrayToStringUtf8(decryptedBytes));
}

/**
 * Encrypts the given JSON data and metadata.
 *
 * @param json - The given JSON data.
 * @param metadata - The given metadata.
 * @param key - The encryption key.
 * @returns - The encrypted data.
 */
export function encryptJSONFile(json: JsonData, metadata: EncryptedFileMetadata, key: Uint8Array): Uint8Array {
  validateObject("json", json, "parameter");
  validateNumber("metadata.version", metadata.version, "parameter");
  validateUint8ArrayLen("key", key, "parameter", ENCRYPTION_KEY_LENGTH);

  // Stringify the json and convert to bytes.
  let data = stringToUint8ArrayUtf8(JSON.stringify(json));

  // Add padding so that the final size will be a padded block. The overhead will be added by encryption and we add the nonce at the end.
  const totalOverhead = ENCRYPTION_OVERHEAD_LENGTH + ENCRYPTION_NONCE_LENGTH + ENCRYPTION_HIDDEN_FIELD_METADATA_LENGTH;
  const finalSize = padFileSize(data.length + totalOverhead) - totalOverhead;
  data = new Uint8Array([...data, ...new Uint8Array(finalSize - data.length)]);

  // Generate a random nonce.
  const nonce = new Uint8Array(randomBytes(ENCRYPTION_NONCE_LENGTH));

  // Encrypt the data.
  const encryptedBytes = secretbox(data, nonce, key);

  // Prepend the metadata.
  const metadataBytes = encodeEncryptedFileMetadata(metadata);
  const finalBytes = new Uint8Array([...metadataBytes, ...encryptedBytes]);

  // Prepend the nonce to the final data.
  return new Uint8Array([...nonce, ...finalBytes]);
}

/**
 * Derives key entropy for the given path seed.
 *
 * @param pathSeed - The given path seed.
 * @returns - The key entropy.
 */
export function deriveEncryptedFileKeyEntropy(pathSeed: string): Uint8Array {
  // Validate the path seed and get bytes.
  const pathSeedBytes = validateAndGetFilePathSeedBytes(pathSeed);

  const bytes = new Uint8Array([...sha512(SALT_ENCRYPTION), ...sha512(pathSeedBytes)]);
  const hashBytes = sha512(bytes);
  // Truncate the hash to the size of an encryption key.
  return hashBytes.slice(0, ENCRYPTION_KEY_LENGTH);
}

/**
 * Derives the encrypted file tweak for the given path seed.
 *
 * @param pathSeed - the given path seed.
 * @returns - The encrypted file tweak.
 */
export function deriveEncryptedFileTweak(pathSeed: string): string {
  // Validate the path seed and get bytes.
  const pathSeedBytes = validateAndGetFilePathSeedBytes(pathSeed);

  let hashBytes = sha512(new Uint8Array([...sha512(SALT_ENCRYPTED_TWEAK), ...sha512(pathSeedBytes)]));
  // Truncate the hash or it will be rejected in skyd.
  hashBytes = hashBytes.slice(0, HASH_LENGTH);
  return toHexString(hashBytes);
}

/* istanbul ignore next */
/**
 * Derives the path seed for the relative path, given the starting path seed and
 * whether it is a directory. The path can be an absolute path if the root seed
 * is given.
 *
 * @param pathSeed - The given starting path seed.
 * @param subPath - The path.
 * @param isDirectory - Whether the path is a directory.
 * @returns - The path seed for the given path.
 * @throws - Will throw if the input sub path is not a valid path.
 * @deprecated - This function has been deprecated in favor of `mySky.deriveEncryptedPathSeed`.
 */
export function deriveEncryptedFileSeed(pathSeed: string, subPath: string, isDirectory: boolean): string {
  return deriveEncryptedPathSeed(pathSeed, subPath, isDirectory);
}

/**
 * Derives the path seed for the relative path, given the starting path seed and
 * whether it is a directory. The path can be an absolute path if the root seed
 * is given.
 *
 * @param pathSeed - The given starting path seed.
 * @param subPath - The path.
 * @param isDirectory - Whether the path is a directory.
 * @returns - The path seed for the given path.
 * @throws - Will throw if the input sub path is not a valid path.
 */
export function deriveEncryptedPathSeed(pathSeed: string, subPath: string, isDirectory: boolean): string {
  validateHexString("pathSeed", pathSeed, "parameter");
  validateString("subPath", subPath, "parameter");
  validateBoolean("isDirectory", isDirectory, "parameter");

  // The path seed must be for a directory and not a file.
  if (pathSeed.length !== ENCRYPTION_PATH_SEED_DIRECTORY_LENGTH) {
    throwValidationError(
      "pathSeed",
      pathSeed,
      "parameter",
      `a directory path seed of length '${ENCRYPTION_PATH_SEED_DIRECTORY_LENGTH}'`
    );
  }

  let pathSeedBytes = hexToUint8Array(pathSeed);
  const sanitizedPath = sanitizePath(subPath);
  if (sanitizedPath === null) {
    throw new Error(`Input subPath '${subPath}' not a valid path`);
  }
  const names = sanitizedPath.split("/");

  names.forEach((name: string, index: number) => {
    const directory = index === names.length - 1 ? isDirectory : true;
    const derivationPathObj: DerivationPathObject = {
      pathSeed: pathSeedBytes,
      directory,
      name,
    };
    const derivationPath = hashDerivationPathObject(derivationPathObj);
    const bytes = new Uint8Array([...sha512(SALT_ENCRYPTED_CHILD), ...derivationPath]);
    pathSeedBytes = sha512(bytes);
  });

  // Truncate the path seed bytes for files only.
  if (!isDirectory) {
    // Divide `ENCRYPTION_PATH_SEED_FILE_LENGTH` by 2 since that is the final hex-encoded length.
    pathSeedBytes = pathSeedBytes.slice(0, ENCRYPTION_PATH_SEED_FILE_LENGTH / 2);
  }
  // Hex-encode the final output.
  return toHexString(pathSeedBytes);
}

/**
 * Hashes the derivation path object.
 *
 * @param obj - The given object containing the derivation path.
 * @returns - The hash.
 */
function hashDerivationPathObject(obj: DerivationPathObject): Uint8Array {
  const bytes = new Uint8Array([...obj.pathSeed, obj.directory ? 1 : 0, ...stringToUint8ArrayUtf8(obj.name)]);
  return sha512(bytes);
}

/**
 * To prevent analysis that can occur by looking at the sizes of files, all
 * encrypted files will be padded to the nearest "pad block" (after encryption).
 * A pad block is minimally 4 kib in size, is always a power of 2, and is always
 * at least 5% of the size of the file.
 *
 * For example, a 1 kib encrypted file would be padded to 4 kib, a 5 kib file
 * would be padded to 8 kib, and a 105 kib file would be padded to 112 kib.
 * Below is a short table of valid file sizes:
 *
 * ```
 *   4 KiB      8 KiB     12 KiB     16 KiB     20 KiB
 *  24 KiB     28 KiB     32 KiB     36 KiB     40 KiB
 *  44 KiB     48 KiB     52 KiB     56 KiB     60 KiB
 *  64 KiB     68 KiB     72 KiB     76 KiB     80 KiB
 *
 *  88 KiB     96 KiB    104 KiB    112 KiB    120 KiB
 * 128 KiB    136 KiB    144 KiB    152 KiB    160 KiB
 *
 * 176 KiB    192 Kib    208 KiB    224 KiB    240 KiB
 * 256 KiB    272 KiB    288 KiB    304 KiB    320 KiB
 *
 * 352 KiB    ... etc
 * ```
 *
 * Note that the first 20 valid sizes are all a multiple of 4 KiB, the next 10
 * are a multiple of 8 KiB, and each 10 after that the multiple doubles. We use
 * this method of padding files to prevent an adversary from guessing the
 * contents or structure of the file based on its size.
 *
 * @param initialSize - The size of the file.
 * @returns - The final size, padded to a pad block.
 * @throws - Will throw if the size would overflow the JS number type.
 */
export function padFileSize(initialSize: number): number {
  const kib = 1 << 10;
  // Only iterate to 53 (the maximum safe power of 2).
  for (let n = 0; n < 53; n++) {
    if (initialSize <= (1 << n) * 80 * kib) {
      const paddingBlock = (1 << n) * 4 * kib;
      let finalSize = initialSize;
      if (finalSize % paddingBlock !== 0) {
        finalSize = initialSize - (initialSize % paddingBlock) + paddingBlock;
      }
      return finalSize;
    }
  }
  // Prevent overflow. Max JS number size is 2^53-1.
  throw new Error("Could not pad file size, overflow detected.");
}

/**
 * Checks if the given size corresponds to the correct padded block.
 *
 * @param size - The given file size.
 * @returns - Whether the size corresponds to a padded block.
 * @throws - Will throw if the size would overflow the JS number type.
 */
export function checkPaddedBlock(size: number): boolean {
  const kib = 1 << 10;
  // Only iterate to 53 (the maximum safe power of 2).
  for (let n = 0; n < 53; n++) {
    if (size <= (1 << n) * 80 * kib) {
      const paddingBlock = (1 << n) * 4 * kib;
      return size % paddingBlock === 0;
    }
  }
  // Prevent overflow. Max JS number size is 2^53-1.
  throw new Error("Could not check padded file size, overflow detected.");
}

/**
 * Decodes the encoded encrypted file metadata.
 *
 * @param bytes - The encoded metadata.
 * @returns - The decoded metadata.
 * @throws - Will throw if the given bytes are of the wrong length.
 */
function decodeEncryptedFileMetadata(bytes: Uint8Array): EncryptedFileMetadata {
  // Ensure input is correct length.
  validateUint8ArrayLen("bytes", bytes, "encrypted file metadata bytes", ENCRYPTION_HIDDEN_FIELD_METADATA_LENGTH);

  const version = bytes[0];

  return {
    version,
  };
}

/**
 * Encodes the given encrypted file metadata.
 *
 * @param metadata - The given metadata.
 * @returns - The encoded metadata bytes.
 * @throws - Will throw if the version does not fit in a byte.
 */
export function encodeEncryptedFileMetadata(metadata: EncryptedFileMetadata): Uint8Array {
  const bytes = new Uint8Array(ENCRYPTION_HIDDEN_FIELD_METADATA_LENGTH);

  // Encode the version
  if (metadata.version >= 1 << 8 || metadata.version < 0) {
    throw new Error(`Metadata version '${metadata.version}' could not be stored in a uint8`);
  }
  // Don't need to use a DataView or worry about endianness for a uint8.
  bytes[0] = metadata.version;

  return bytes;
}

/**
 * Validates the path seed and converts it to bytes.
 *
 * @param pathSeed - The given path seed.
 * @returns - The path seed bytes.
 */
function validateAndGetFilePathSeedBytes(pathSeed: string): Uint8Array {
  validateHexString("pathSeed", pathSeed, "parameter");

  if (pathSeed.length !== ENCRYPTION_PATH_SEED_FILE_LENGTH) {
    throwValidationError(
      "pathSeed",
      pathSeed,
      "parameter",
      `a valid file path seed of length '${ENCRYPTION_PATH_SEED_FILE_LENGTH}'`
    );
  }

  // Convert hex string to bytes.
  //
  // NOTE: This should have been `hexToUint8Array` but it has been left for
  // backwards compatibility with existing encrypted file tweaks. Because hex
  // strings are valid UTF8 strings, `stringToUint8ArrayUtf8` converts them to
  // byte arrays that are suitable for deriving tweaks from. These bytes are
  // never used to derive further path seed bytes.
  return stringToUint8ArrayUtf8(pathSeed);
}
