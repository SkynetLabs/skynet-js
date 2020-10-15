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
  return HashAll(registryValue.tweak, encodeString(registryValue.data), encodeUint8(registryValue.revision));
}

// HashFileID hashes the given fileID
export function HashFileID(fileID: FileID): Uint8Array {
  return HashAll(
    encodeUint8(fileID.version),
    encodeString(fileID.applicationID),
    encodeUint8(fileID.fileType),
    encodeString(fileID.filename)
  );
}

// encodeUint8 converts the given number into a uint8 array
function encodeUint8(num: number): Uint8Array {
  if (num > 255) {
    throw new Error("overflow");
  }
  const encoded = new Uint8Array(8);
  encoded[0] = num;
  return encoded;
}

// encodeUint8 converts the given string into a uint8 array
function encodeString(str: string): Uint8Array {
  const encoded = new Uint8Array(8 + str.length);
  encoded.set(encodeUint8(str.length));
  encoded.set(stringToUint8Array(str), 8);
  return encoded;
}
