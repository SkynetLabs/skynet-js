import { fromByteArray } from "base64-js";
import { encodePrefixedBytes, hashAll } from "../crypto";
import { hexToUint8Array, isASCIIString, stringToUint8ArrayUtf8, trimSuffix } from "../utils/string";
import { validateHexString, validateUint8ArrayLen } from "../utils/validation";

// rawSkylinkSize is the raw size of the data that gets put into a link.
const RAW_SKYLINK_SIZE = 34;

export class SiaSkylink {
  constructor(public bitfield: number, public merkleRoot: Uint8Array) {}

  toBytes(): Uint8Array {
    const buf = new ArrayBuffer(RAW_SKYLINK_SIZE);
    const view = new DataView(buf);

    view.setUint16(0, this.bitfield, true);
    const uint8Bytes = new Uint8Array(buf);
    uint8Bytes.set(this.merkleRoot, 2);

    return uint8Bytes;
  }

  toString(): string {
    let base64 = fromByteArray(this.toBytes());
    // Change to URL encoding.
    base64 = base64.replace(/\+/g, "-").replace(/\//g, "_");
    // Remove padding characters.
    return trimSuffix(base64, "=");
  }
}

const SPECIFIER_LEN = 16;

/**
 * Returns a specifier for given name, a specifier can only be 16 bytes so we
 * panic if the given name is too long.
 */
export function newSpecifier(name: string): Uint8Array {
  validateSpecifier(name);
  const specifier = new Uint8Array(SPECIFIER_LEN);
  specifier.set(stringToUint8ArrayUtf8(name));
  return specifier;
}

const PUBLIC_KEY_SIZE = 32;

class SiaPublicKey {
  constructor (
    public algorithm: Uint8Array,
    public key: Uint8Array,
  ) {}

  marshalSia(): Uint8Array {
    const bytes = new Uint8Array(SPECIFIER_LEN + 8 + PUBLIC_KEY_SIZE);
    bytes.set(this.algorithm);
    bytes.set(encodePrefixedBytes(this.key), SPECIFIER_LEN);
    return bytes;
  }
}

export function newEd25519PublicKey(publicKey: string): SiaPublicKey {
  validateHexString("publicKey", publicKey, "parameter");

  const algorithm = newSpecifier("ed25519");
  const publicKeyBytes = hexToUint8Array(publicKey);
  validateUint8ArrayLen("publicKeyBytes", publicKeyBytes, "converted publicKey", PUBLIC_KEY_SIZE);

  return new SiaPublicKey(algorithm, publicKeyBytes);
}

export function newSkylinkV2(siaPublicKey: SiaPublicKey, tweak: Uint8Array): SiaSkylink {
  const version = 2;
  const bitfield = (version - 1);
  const merkleRoot = deriveRegistryEntryID(siaPublicKey, tweak);
  return new SiaSkylink(bitfield, merkleRoot);
}

function deriveRegistryEntryID(pubKey: SiaPublicKey, tweak: Uint8Array): Uint8Array {
  return hashAll(pubKey.marshalSia(), tweak);
}

/**
 * Performs validation checks on the specifier name, it panics when the input is
 * invalid seeing we want to catch this on runtime.
 */
function validateSpecifier(name: string) {
  if (!isASCIIString(name)) {
    throw new Error("ERROR: specifier has to be ASCII");
  }
  if (name.length > SPECIFIER_LEN) {
    throw new Error("ERROR: specifier max length exceeded");
  }
}
