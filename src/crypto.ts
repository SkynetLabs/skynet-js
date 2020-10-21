import blake from "blakejs";
import { RegistryValue } from "./registry";
import { FileID } from "./skydb";
import { stringToUint8Array } from "./utils";

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
