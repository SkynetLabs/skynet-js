import { hashAll } from "../crypto";
import { decodeSkylinkBase64, encodeSkylinkBase64, encodePrefixedBytes, decodeSkylinkBase32 } from "../utils/encoding";
import { hexToUint8Array, stringToUint8ArrayUtf8, trimUriPrefix } from "../utils/string";
import { uriSkynetPrefix } from "../utils/url";
import { validateHexString, validateNumber, validateString, validateUint8ArrayLen } from "../utils/validation";

/**
 * The string length of the Skylink after it has been encoded using base32.
 */
export const BASE32_ENCODED_SKYLINK_SIZE = 55;

/**
 * The string length of the Skylink after it has been encoded using base64.
 */
export const BASE64_ENCODED_SKYLINK_SIZE = 46;

/**
 * Returned when a string could not be decoded into a Skylink due to it having
 * an incorrect size.
 */
const ERR_SKYLINK_INCORRECT_SIZE = "skylink has incorrect size";

/**
 * The raw size in bytes of the data that gets put into a link.
 */
export const RAW_SKYLINK_SIZE = 34;

/**
 * An empty skylink.
 */
export const EMPTY_SKYLINK = new Uint8Array(RAW_SKYLINK_SIZE);

export class SiaSkylink {
  constructor(public bitfield: number, public merkleRoot: Uint8Array) {
    validateNumber("bitfield", bitfield, "constructor parameter");
    validateUint8ArrayLen("merkleRoot", merkleRoot, "constructor parameter", 32);
  }

  toBytes(): Uint8Array {
    const buf = new ArrayBuffer(RAW_SKYLINK_SIZE);
    const view = new DataView(buf);

    view.setUint16(0, this.bitfield, true);
    const uint8Bytes = new Uint8Array(buf);
    uint8Bytes.set(this.merkleRoot, 2);

    return uint8Bytes;
  }

  toString(): string {
    return encodeSkylinkBase64(this.toBytes());
  }
}

/**
 * Checks if the given string is a v1 skylink.
 *
 * @param s
 */
export function isSkylinkV1(s: string): boolean {
  const raw = decodeSkylink(s);

  // Load and check the bitfield.
  const view = new DataView(raw.buffer);
  const bitfield = view.getUint16(0, true);

  return isBitfieldSkylinkV1(bitfield);
}

/**
 * Checks if the given string is a v2 skylink.
 *
 * @param s
 */
export function isSkylinkV2(s: string): boolean {
  // Decode the base into raw data.
  const raw = decodeSkylink(s);

  // Load and check the bitfield.
  const view = new DataView(raw.buffer);
  const bitfield = view.getUint16(0, true);

  return isBitfieldSkylinkV2(bitfield);
}

/**
 * Returns a boolean indicating if the Skylink is a V1 skylink
 *
 * @param bitfield
 */
function isBitfieldSkylinkV1(bitfield: number): boolean {
  return (bitfield & 3) === 0;
}

/**
 * Returns a boolean indicating if the Skylink is a V2 skylink
 *
 * @param bitfield
 */
function isBitfieldSkylinkV2(bitfield: number): boolean {
  // We compare against 1 here because a V2 skylink only uses the version
  // bits. All other bits should be set to 0.
  return bitfield == 1;
}

const SPECIFIER_LEN = 16;

/**
 * Returns a specifier for given name, a specifier can only be 16 bytes so we
 * panic if the given name is too long.
 *
 * @param name - The name.
 * @returns - The specifier, if valid.
 */
export function newSpecifier(name: string): Uint8Array {
  validateString("name", name, "parameter");

  const specifier = new Uint8Array(SPECIFIER_LEN);
  specifier.set(stringToUint8ArrayUtf8(name));
  return specifier;
}

const PUBLIC_KEY_SIZE = 32;

class SiaPublicKey {
  constructor(public algorithm: Uint8Array, public key: Uint8Array) {}

  marshalSia(): Uint8Array {
    const bytes = new Uint8Array(SPECIFIER_LEN + 8 + PUBLIC_KEY_SIZE);
    bytes.set(this.algorithm);
    bytes.set(encodePrefixedBytes(this.key), SPECIFIER_LEN);
    return bytes;
  }
}

/**
 * Creates a new sia public key. Matches Ed25519PublicKey in sia.
 *
 * @param publicKey - The hex-encoded public key.
 * @returns - The SiaPublicKey.
 */
export function newEd25519PublicKey(publicKey: string): SiaPublicKey {
  validateHexString("publicKey", publicKey, "parameter");

  const algorithm = newSpecifier("ed25519");
  const publicKeyBytes = hexToUint8Array(publicKey);
  validateUint8ArrayLen("publicKeyBytes", publicKeyBytes, "converted publicKey", PUBLIC_KEY_SIZE);

  return new SiaPublicKey(algorithm, publicKeyBytes);
}

/**
 * Creates a new v2 skylink. Matches NewSkylinkV2 in skyd.
 *
 * @param siaPublicKey - The public key as a SiaPublicKey.
 * @param tweak - The hashed tweak.
 * @returns - The v2 skylink.
 */
export function newSkylinkV2(siaPublicKey: SiaPublicKey, tweak: Uint8Array): SiaSkylink {
  const version = 2;
  const bitfield = version - 1;
  const merkleRoot = deriveRegistryEntryID(siaPublicKey, tweak);
  return new SiaSkylink(bitfield, merkleRoot);
}

/**
 * A helper function that decodes the given string representation of a skylink
 * into raw bytes. It either performs a base32 decoding, or base64 decoding,
 * depending on the length.
 *
 * @param encoded - The encoded string.
 * @returns - The decoded raw bytes.
 */
export function decodeSkylink(encoded: string): Uint8Array {
  encoded = trimUriPrefix(encoded, uriSkynetPrefix);

  let bytes;
  if (encoded.length === BASE32_ENCODED_SKYLINK_SIZE) {
    bytes = decodeSkylinkBase32(encoded);
  } else if (encoded.length === BASE64_ENCODED_SKYLINK_SIZE) {
    bytes = decodeSkylinkBase64(encoded);
  } else {
    throw new Error(ERR_SKYLINK_INCORRECT_SIZE);
  }

  // Sanity check the size of the given data.
  if (bytes.length != RAW_SKYLINK_SIZE) {
    throw new Error("failed to load skylink data");
  }

  return bytes;
}

/**
 * A helper to derive an entry id for a registry key value pair. Matches `DeriveRegistryEntryID` in sia.
 *
 * @param pubKey - The sia public key.
 * @param tweak - The tweak.
 * @returns - The entry ID as a hash of the inputs.
 */
function deriveRegistryEntryID(pubKey: SiaPublicKey, tweak: Uint8Array): Uint8Array {
  return hashAll(pubKey.marshalSia(), tweak);
}
