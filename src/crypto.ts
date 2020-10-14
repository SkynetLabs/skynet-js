import blake from "blakejs";
import { RegistryValue } from "./registry";
import { FileID } from "./skydb";

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

// HashRegistryValue hashes the given registry value and returns it as a hex
// encoded string
export function HashRegistryValue(registryValue: RegistryValue): string {
  return Buffer.from(
    HashAll(
      hexToUint8Array(registryValue.tweak),
      encodeString(registryValue.data),
      encodeNumber(registryValue.revision)
    )
  ).toString("hex");
}

// HashFileID hashes the given fileID and returns it as a hex encoded string
export function HashFileID(fileID: FileID): string {
  return Buffer.from(
    HashAll(
      encodeNumber(fileID.version),
      encodeString(fileID.applicationID),
      encodeNumber(fileID.fileType),
      encodeString(fileID.filename)
    )
  ).toString("hex");
}

// stringToUint8Array converts a string to a uint8 array
function stringToUint8Array(str: string): Uint8Array {
  return Uint8Array.from(Buffer.from(str));
}

// hexToUint8Array converts a hex encoded string to a uint8 array
function hexToUint8Array(str: string) {
  return new Uint8Array(str.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));
}

// encodeNumber converts the given number into a uint8 array
function encodeNumber(num: number): Uint8Array {
  if (num > 255) {
    throw new Error("overflow");
  }
  const encoded = new Uint8Array(8);
  encoded[0] = num;
  return encoded;
}

// encodeNumber converts the given string into a uint8 array
function encodeString(str: string): Uint8Array {
  const encoded = new Uint8Array(8 + str.length);
  encoded.set(encodeNumber(str.length));
  encoded.set(stringToUint8Array(str), 8);
  return encoded;
}
