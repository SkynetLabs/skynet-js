import { pki, pkcs5, md } from "node-forge";
import blake from "blakejs";
import { RegistryEntry } from "./registry";
import { stringToUint8Array } from "./utils";
import { randomBytes } from "randombytes";

export type PublicKey = pki.ed25519.NativeBuffer;
export type SecretKey = pki.ed25519.NativeBuffer;
export type Signature = pki.ed25519.NativeBuffer;

// NewHash returns a blake2b 256bit hasher.
function NewHash() {
  return blake.blake2bInit(32, null);
}

// HashAll takes all given arguments and hashes them.
export function HashAll(...args: any[]): Uint8Array {
  const h = NewHash();
  for (let i = 0; i < args.length; i++) {
    blake.blake2bUpdate(h, args[i]);
  }
  return blake.blake2bFinal(h);
}

// Hash the given data key.
export function HashDataKey(datakey: string): Uint8Array {
  return HashAll(encodeString(datakey));
}

// Hashes the given registry entry.
export function HashRegistryEntry(registryEntry: RegistryEntry): Uint8Array {
  return HashAll(
    HashDataKey(registryEntry.datakey),
    encodeString(registryEntry.data),
    encodeNumber(registryEntry.revision)
  );
}

// encodeNumber converts the given number into a uint8 array
function encodeNumber(num: number): Uint8Array {
  const encoded = new Uint8Array(8);
  for (let index = 0; index < encoded.length; index++) {
    const byte = num & 0xff;
    encoded[index] = byte;
    num = num >> 8;
  }
  return encoded;
}

// encodeString converts the given string into a uint8 array
function encodeString(str: string): Uint8Array {
  const encoded = new Uint8Array(8 + str.length);
  encoded.set(encodeNumber(str.length));
  encoded.set(stringToUint8Array(str), 8);
  return encoded;
}

export function deriveChildSeed(masterSeed: string, seed: string): string {
  return HashAll(masterSeed, seed).toString();
}

/**
 * Generates a master key pair and seed.
 * @param [length=64] - The number of random bytes for the seed. Note that the string seed will be converted to hex representation, making it twice this length.
 */
export function generateKeyPairAndSeed(length = 64): { publicKey: PublicKey; privateKey: SecretKey; seed: string } {
  const seed = makeSeed(length);
  return { ...keyPairFromSeed(seed), seed };
}

/**
 * Generates a public and private key from a provided, secure seed.
 * @param seed - A secure seed.
 */
export function keyPairFromSeed(seed: string): { publicKey: PublicKey; privateKey: SecretKey } {
  // Get a 32-byte seed.
  seed = pkcs5.pbkdf2(seed, "", 1000, 32, md.sha256.create());
  return pki.ed25519.generateKeyPair({ seed });
}

function makeSeed(length: number): string {
  // Cryptographically-secure random number generator. It should use the
  // built-in crypto.getRandomValues in the browser.
  const array = randomBytes(length);
  return Buffer.from(array).toString("hex");
}
