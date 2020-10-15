import blake from "blakejs";
import { RegistryValue } from "./registry";
import { FileID, User } from "./skydb";
import { Buffer } from "buffer";

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

// HashRegistryValue hashes the given registry value
export function HashRegistryValue(registryValue: RegistryValue): Uint8Array {
  return HashAll(registryValue.tweak, encodeString(registryValue.data), encodeNumber(registryValue.revision));
}

// HashFileID hashes the given fileID
export function HashFileID(fileID: FileID): Uint8Array {
  return HashAll(
    encodeNumber(fileID.version),
    encodeString(fileID.applicationID),
    encodeNumber(fileID.fileType),
    encodeString(fileID.filename)
  );
}

// stringToUint8Array converts a string to a uint8 array
export function stringToUint8Array(str: string): Uint8Array {
  return Uint8Array.from(Buffer.from(str));
}

// hexToUint8Array converts a hex encoded string to a uint8 array
export function hexToUint8Array(str: string) {
  return new Uint8Array(str.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));
}

// encodeNumber converts the given number into a uint8 array
export function encodeNumber(num: number): Uint8Array {
  if (num > 255) {
    throw new Error("overflow");
  }
  const encoded = new Uint8Array(8);
  encoded[0] = num;
  return encoded;
}

// encodeNumber converts the given string into a uint8 array
export function encodeString(str: string): Uint8Array {
  const encoded = new Uint8Array(8 + str.length);
  encoded.set(encodeNumber(str.length));
  encoded.set(stringToUint8Array(str), 8);
  return encoded;
}

export function EncodeUserPublicKey(user: User): Uint8Array {
  const encoded = new Uint8Array(16 + 8 + 32);
  encoded.set(Uint16Array.from(Buffer.from("ed25519")));
  encoded.set(encodeNumber(32), 16);
  encoded.set(hexToUint8Array(user.id), 24);
  return encoded;
}
