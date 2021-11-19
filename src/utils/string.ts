import { Buffer } from "buffer";

import { validateHexString, validateString, validationError } from "./validation";

/**
 * Prepends the prefix to the given string only if the string does not already start with the prefix.
 *
 * @param str - The string.
 * @param prefix - The prefix.
 * @returns - The prefixed string.
 */
export function ensurePrefix(str: string, prefix: string): string {
  if (!str.startsWith(prefix)) {
    str = `${prefix}${str}`;
  }
  return str;
}

/**
 * Removes slashes from the beginning and end of the string.
 *
 * @param str - The string to process.
 * @returns - The processed string.
 */
export function trimForwardSlash(str: string): string {
  return trimPrefix(trimSuffix(str, "/"), "/");
}

// TODO: Move to mysky-utils
/**
 * Removes a prefix from the beginning of the string.
 *
 * @param str - The string to process.
 * @param prefix - The prefix to remove.
 * @param [limit] - Maximum amount of times to trim. No limit by default.
 * @returns - The processed string.
 */
export function trimPrefix(str: string, prefix: string, limit?: number): string {
  while (str.startsWith(prefix)) {
    if (limit !== undefined && limit <= 0) {
      break;
    }
    str = str.slice(prefix.length);
    if (limit) {
      limit -= 1;
    }
  }
  return str;
}

// TODO: Move to mysky-utils
/**
 * Removes a suffix from the end of the string.
 *
 * @param str - The string to process.
 * @param suffix - The suffix to remove.
 * @param [limit] - Maximum amount of times to trim. No limit by default.
 * @returns - The processed string.
 */
export function trimSuffix(str: string, suffix: string, limit?: number): string {
  while (str.endsWith(suffix)) {
    if (limit !== undefined && limit <= 0) {
      break;
    }
    str = str.substring(0, str.length - suffix.length);
    if (limit) {
      limit -= 1;
    }
  }
  return str;
}

/**
 * Removes a URI prefix from the beginning of the string.
 *
 * @param str - The string to process.
 * @param prefix - The prefix to remove. Should contain double slashes, e.g. sia://.
 * @returns - The processed string.
 */
export function trimUriPrefix(str: string, prefix: string): string {
  const longPrefix = prefix.toLowerCase();
  const shortPrefix = trimSuffix(longPrefix, "/");
  // Make sure the trimming is case-insensitive.
  const strLower = str.toLowerCase();
  if (strLower.startsWith(longPrefix)) {
    // longPrefix is exactly at the beginning
    return str.slice(longPrefix.length);
  }
  if (strLower.startsWith(shortPrefix)) {
    // else shortPrefix is exactly at the beginning
    return str.slice(shortPrefix.length);
  }
  return str;
}

/**
 * Converts a UTF-8 string to a uint8 array containing valid UTF-8 bytes.
 *
 * @param str - The string to convert.
 * @returns - The uint8 array.
 * @throws - Will throw if the input is not a string.
 */
export function stringToUint8ArrayUtf8(str: string): Uint8Array {
  validateString("str", str, "parameter");

  return Uint8Array.from(Buffer.from(str, "utf-8"));
}

/**
 * Converts a uint8 array containing valid utf-8 bytes to a string.
 *
 * @param array - The uint8 array to convert.
 * @returns - The string.
 */
export function uint8ArrayToStringUtf8(array: Uint8Array): string {
  return Buffer.from(array).toString("utf-8");
}

/**
 * Converts a hex encoded string to a uint8 array.
 *
 * @param str - The string to convert.
 * @returns - The uint8 array.
 * @throws - Will throw if the input is not a valid hex-encoded string or is an empty string.
 */
export function hexToUint8Array(str: string): Uint8Array {
  validateHexString("str", str, "parameter");

  const matches = str.match(/.{1,2}/g);
  if (matches === null) {
    throw validationError("str", str, "parameter", "a hex-encoded string");
  }

  return new Uint8Array(matches.map((byte) => parseInt(byte, 16)));
}

/**
 * Returns true if the input is a valid hex-encoded string.
 *
 * @param str - The input string.
 * @returns - True if the input is hex-encoded.
 * @throws - Will throw if the input is not a string.
 */
export function isHexString(str: string): boolean {
  validateString("str", str, "parameter");

  return /^[0-9A-Fa-f]*$/g.test(str);
}

/**
 * Convert a byte array to a hex string.
 *
 * @param byteArray - The byte array to convert.
 * @returns - The hex string.
 * @see {@link https://stackoverflow.com/a/44608819|Stack Overflow}
 */
export function toHexString(byteArray: Uint8Array): string {
  let s = "";
  byteArray.forEach(function (byte) {
    s += ("0" + (byte & 0xff).toString(16)).slice(-2);
  });
  return s;
}
