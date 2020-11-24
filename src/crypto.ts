import { pki, pkcs5, md } from "node-forge";
import blake from "blakejs";
import { RegistryEntry } from "./registry";
import { stringToUint8Array, toHexString } from "./utils";
import randomBytes from "randombytes";

export type PublicKey = pki.ed25519.NativeBuffer;
export type SecretKey = pki.ed25519.NativeBuffer;
export type Signature = pki.ed25519.NativeBuffer;

// Returns a blake2b 256bit hasher. See `NewHash` in Sia.
function newHash() {
  return blake.blake2bInit(32, null);
}

// Takes all given arguments and hashes them.
export function hashAll(...args: Uint8Array[]): Uint8Array {
  const hasher = newHash();
  for (let i = 0; i < args.length; i++) {
    blake.blake2bUpdate(hasher, args[i]);
  }
  return blake.blake2bFinal(hasher);
}

// Hash the given data key.
export function hashDataKey(datakey: string): Uint8Array {
  return hashAll(encodeString(datakey));
}

// Hashes the given registry entry.
export function hashRegistryEntry(registryEntry: RegistryEntry): Uint8Array {
  return hashAll(
    hashDataKey(registryEntry.datakey),
    encodeString(registryEntry.data),
    encodeBigintAsUint64(registryEntry.revision)
  );
}

// Converts the given number into a uint8 array
function encodeNumber(num: number): Uint8Array {
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
 */
export function encodeBigintAsUint64(int: bigint): Uint8Array {
  // Assert the input is 64 bits.
  const newint = BigInt.asUintN(64, int);
  if (newint != int) {
    throw new Error("Received int > 2^64-1");
  }

  const encoded = new Uint8Array(8);
  for (let index = 0; index < encoded.length; index++) {
    const byte = int & BigInt(0xff);
    encoded[index] = Number(byte);
    int = int >> BigInt(8);
  }
  return encoded;
}

// Converts the given string into a uint8 array
function encodeString(str: string): Uint8Array {
  const encoded = new Uint8Array(8 + str.length);
  encoded.set(encodeNumber(str.length));
  encoded.set(stringToUint8Array(str), 8);
  return encoded;
}

export function deriveChildSeed(masterSeed: string, seed: string): string {
  return toHexString(hashAll(encodeString(masterSeed), encodeString(seed)));
}

/**
 * Generates a master key pair and seed.
 * @param [length=64] - The number of random bytes for the seed. Note that the string seed will be converted to hex representation, making it twice this length.
 */
export function genKeyPairAndSeed(length = 64): { publicKey: string; privateKey: string; seed: string } {
  const seed = makeSeed(length);
  return { ...genKeyPairFromSeed(seed), seed };
}

/**
 * Generates a public and private key from a provided, secure seed.
 * @param seed - A secure seed.
 */
export function genKeyPairFromSeed(seed: string): { publicKey: string; privateKey: string } {
  // Get a 32-byte seed.
  seed = pkcs5.pbkdf2(seed, "", 1000, 32, md.sha256.create());
  const { publicKey, privateKey } = pki.ed25519.generateKeyPair({ seed });
  return { publicKey: toHexString(publicKey), privateKey: toHexString(privateKey) };
}

function makeSeed(length: number): string {
  // Cryptographically-secure random number generator. It should use the
  // built-in crypto.getRandomValues in the browser.
  const array = randomBytes(length);
  return toHexString(array);
}
