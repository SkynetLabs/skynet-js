import { fromByteArray, toByteArray } from "base64-js";

import { assertUint64 } from "./number";
import { stringToUint8ArrayUtf8 } from "./string";

export function base64RawUrlToByteArray(s: string): Uint8Array {
  // Convert from URL encoding.
  s = s.replace(/\-/g, "+").replace(/\_/g, "/");
  const bytes = toByteArray(s);
  return bytes;
}

export function byteArrayToBase64RawUrl(bytes: Uint8Array): string {
  let base64 = fromByteArray(bytes);
  // Convert to URL encoding.
  base64 = base64.replace(/\+/g, "-").replace(/\//g, "_");
  return base64;
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
 * Encodes the given bigint into a uint8 array.
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
 * Encodes the uint8array, prefixed by its length.
 *
 * @param bytes - The input array.
 * @returns - The encoded byte array.
 */
export function encodePrefixedBytes(bytes: Uint8Array): Uint8Array {
  const len = bytes.length;
  const buf = new ArrayBuffer(8 + len);
  const view = new DataView(buf);

  // Sia uses setUint64 which is unavailable in JS.
  view.setUint32(0, len, true);
  const uint8Bytes = new Uint8Array(buf);
  uint8Bytes.set(bytes, 8);

  return uint8Bytes;
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
