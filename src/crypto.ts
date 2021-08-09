import { misc, codec } from "sjcl";
import { Buffer } from "buffer";
import { blake2bFinal, blake2bInit, blake2bUpdate } from "blakejs";
import randomBytes from "randombytes";
import { hash, sign } from "tweetnacl";

import { RegistryEntry } from "./registry";
import { hexToUint8Array, stringToUint8ArrayUtf8, toHexString } from "./utils/string";
import { validateNumber, validateString } from "./utils/validation";
import { encodeBigintAsUint64, encodePrefixedBytes, encodeUtf8String } from "./utils/encoding";

export type Signature = Buffer;

/**
 * Key pair.
 *
 * @property publicKey - The public key.
 * @property privateKey - The private key.
 */
export type KeyPair = {
  publicKey: string;
  privateKey: string;
};

/**
 * Key pair and seed.
 *
 * @property seed - The secure seed.
 */
export type KeyPairAndSeed = KeyPair & {
  seed: string;
};

export const HASH_LENGTH = 32;

/**
 * Returns a blake2b 256bit hasher. See `NewHash` in Sia.
 *
 * @returns - blake2b 256bit hasher.
 */
function newHash() {
  return blake2bInit(32);
}

/**
 * Derives a child seed from the given master seed and sub seed.
 *
 * @param masterSeed - The master seed to derive from.
 * @param seed - The sub seed for the derivation.
 * @returns - The child seed derived from `masterSeed` using `seed`.
 * @throws - Will throw if the inputs are not strings.
 */
export function deriveChildSeed(masterSeed: string, seed: string): string {
  validateString("masterSeed", masterSeed, "parameter");
  validateString("seed", seed, "parameter");

  return toHexString(hashAll(encodeUtf8String(masterSeed), encodeUtf8String(seed)));
}

/**
 * Generates a master key pair and seed.
 *
 * @param [length=64] - The number of random bytes for the seed. Note that the string seed will be converted to hex representation, making it twice this length.
 * @returns - The generated key pair and seed.
 */
export function genKeyPairAndSeed(length = 64): KeyPairAndSeed {
  validateNumber("length", length, "parameter");

  const seed = makeSeed(length);
  return { ...genKeyPairFromSeed(seed), seed };
}

/**
 * Generates a public and private key from a provided, secure seed.
 *
 * @param seed - A secure seed.
 * @returns - The generated key pair.
 * @throws - Will throw if the input is not a string.
 */
export function genKeyPairFromSeed(seed: string): KeyPair {
  validateString("seed", seed, "parameter");

  // Get a 32-byte key.
  const derivedKey = misc.pbkdf2(seed, "", 1000, 32 * 8);
  const derivedKeyHex = codec.hex.fromBits(derivedKey);
  const { publicKey, secretKey } = sign.keyPair.fromSeed(hexToUint8Array(derivedKeyHex));

  return { publicKey: toHexString(publicKey), privateKey: toHexString(secretKey) };
}

/**
 * Takes all given arguments and hashes them.
 *
 * @param args - Byte arrays to hash.
 * @returns - The final hash as a byte array.
 */
export function hashAll(...args: Uint8Array[]): Uint8Array {
  const hasher = newHash();
  args.forEach((arg) => blake2bUpdate(hasher, arg));
  return blake2bFinal(hasher);
}

// TODO: Is this the same as hashString?
/**
 * Hash the given data key.
 *
 * @param dataKey - Data key to hash.
 * @returns - Hash of the data key.
 */
export function hashDataKey(dataKey: string): Uint8Array {
  return hashAll(encodeUtf8String(dataKey));
}

/**
 * Hashes the given registry entry.
 *
 * @param registryEntry - Registry entry to hash.
 * @param hashedDataKeyHex - Whether the data key is already hashed and in hex format. If not, we hash the data key.
 * @returns - Hash of the registry entry.
 */
export function hashRegistryEntry(registryEntry: RegistryEntry, hashedDataKeyHex: boolean): Uint8Array {
  let dataKeyBytes;
  if (hashedDataKeyHex) {
    dataKeyBytes = hexToUint8Array(registryEntry.dataKey);
  } else {
    dataKeyBytes = hashDataKey(registryEntry.dataKey);
  }

  const dataBytes = encodePrefixedBytes(registryEntry.data);

  return hashAll(dataKeyBytes, dataBytes, encodeBigintAsUint64(registryEntry.revision));
}

/**
 * Hashes the given string or byte array using sha512.
 *
 * @param message - The string or byte array to hash.
 * @returns - The resulting hash.
 */
export function sha512(message: Uint8Array | string): Uint8Array {
  if (typeof message === "string") {
    return hash(stringToUint8ArrayUtf8(message));
  } else {
    return hash(message);
  }
}

/**
 * Generates a random seed of the given length in bytes.
 *
 * @param length - Length of the seed in bytes.
 * @returns - The generated seed.
 */
function makeSeed(length: number): string {
  // Cryptographically-secure random number generator. It should use the
  // built-in crypto.getRandomValues in the browser.
  const array = randomBytes(length);
  return toHexString(array);
}
