import { misc, codec } from "sjcl";
import { Buffer } from "buffer";
import { blake2bFinal, blake2bInit, blake2bUpdate } from "blakejs";
import randomBytes from "randombytes";
import { sign } from "tweetnacl";

import { RegistryEntry } from "./registry";
import { assertUint64 } from "./utils/number";
import { hexToUint8Array, stringToUint8ArrayUtf8, toHexString } from "./utils/string";
import { validateNumber, validateString } from "./utils/validation";

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

/**
 * Returns a blake2b 256bit hasher. See `NewHash` in Sia.
 *
 * @returns - blake2b 256bit hasher.
 */
function newHash() {
  return blake2bInit(32, null);
}

/**
 * Converts the given number into a uint8 array
 *
 * @param num - Number to encode.
 * @returns - Number encoded as a byte array.
 */
export function encodeNumber(num: number): Uint8Array {
  const encoded = new Uint8Array(8);
  for (let index = 0; index < encoded.length; index++) {
    const byte = num & 0xff;
    encoded[index] = byte;
    num = num >> 8;
  }
  return encoded;
}

/**
 * Converts the given bigint into a uint8 array.
 *
 * @param int - Bigint to encode.
 * @returns - Bigint encoded as a byte array.
 * @throws - Will throw if the int does not fit in 64 bits.
 */
export function encodeBigintAsUint64(int: bigint): Uint8Array {
  // Assert the input is 64 bits.
  assertUint64(int);

  const encoded = new Uint8Array(8);
  for (let index = 0; index < encoded.length; index++) {
    const byte = int & BigInt(0xff);
    encoded[index] = Number(byte);
    int = int >> BigInt(8);
  }
  return encoded;
}

/**
 * Encodes the given UTF-8 string into a uint8 array containing the string length and the string.
 *
 * @param str - String to encode.
 * @returns - String encoded as a byte array.
 */
export function encodeUtf8String(str: string): Uint8Array {
  const byteArray = stringToUint8ArrayUtf8(str);
  const encoded = new Uint8Array(8 + byteArray.length);
  encoded.set(encodeNumber(byteArray.length));
  encoded.set(byteArray, 8);
  return encoded;
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
  for (let i = 0; i < args.length; i++) {
    blake2bUpdate(hasher, args[i]);
  }
  return blake2bFinal(hasher);
}

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

  return hashAll(dataKeyBytes, encodeUtf8String(registryEntry.data), encodeBigintAsUint64(registryEntry.revision));
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
