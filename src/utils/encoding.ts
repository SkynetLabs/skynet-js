import base32Decode from "base32-decode";
import base32Encode from "base32-encode";
import { fromByteArray, toByteArray } from "base64-js";

import { assertUint64 } from "./number";
import { BASE32_ENCODED_SKYLINK_SIZE, BASE64_ENCODED_SKYLINK_SIZE } from "../skylink/sia";
import { stringToUint8ArrayUtf8 } from "./string";
import { validateStringLen } from "./validation";

const BASE32_ENCODING_VARIANT = "RFC4648-HEX";

/**
 * Decodes the skylink encoded using base32 encoding to bytes.
 *
 * @param skylink - The encoded skylink.
 * @returns - The decoded bytes.
 */
export function decodeSkylinkBase32(skylink: string): Uint8Array {
  validateStringLen("skylink", skylink, "parameter", BASE32_ENCODED_SKYLINK_SIZE);
  skylink = skylink.toUpperCase();
  const bytes = base32Decode(skylink, BASE32_ENCODING_VARIANT);
  return new Uint8Array(bytes);
}

/**
 * Encodes the bytes to a skylink encoded using base32 encoding.
 *
 * @param bytes - The bytes to encode.
 * @returns - The encoded skylink.
 */
export function encodeSkylinkBase32(bytes: Uint8Array): string {
  return base32Encode(bytes, BASE32_ENCODING_VARIANT, { padding: false }).toLowerCase();
}

/**
 * Decodes the skylink encoded using base64 raw URL encoding to bytes.
 *
 * @param skylink - The encoded skylink.
 * @returns - The decoded bytes.
 */
export function decodeSkylinkBase64(skylink: string): Uint8Array {
  validateStringLen("skylink", skylink, "parameter", BASE64_ENCODED_SKYLINK_SIZE);
  // Add padding.
  skylink = `${skylink}==`;
  // Convert from URL encoding.
  skylink = skylink.replace(/-/g, "+").replace(/_/g, "/");
  return toByteArray(skylink);
}

/**
 * Encodes the bytes to a skylink encoded using base64 raw URL encoding.
 *
 * @param bytes - The bytes to encode.
 * @returns - The encoded skylink.
 */
export function encodeSkylinkBase64(bytes: Uint8Array): string {
  let base64 = fromByteArray(bytes);
  // Convert to URL encoding.
  base64 = base64.replace(/\+/g, "-").replace(/\//g, "_");
  // Remove trailing "==". This will always be present as the skylink encoding
  // gets padded so that the string is a multiple of 4 characters in length.
  return base64.slice(0, -2);
}

/**
 * Converts the given number into a uint8 array. Uses little-endian encoding.
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
 * Encodes the given bigint into a uint8 array. Uses little-endian encoding.
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
