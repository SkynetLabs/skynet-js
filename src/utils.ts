import base64 from "base64-js";
import base32Encode from "base32-encode";
import mimeDB from "mime-db";
import path from "path-browserify";
import parse from "url-parse";
import urljoin from "url-join";
import { Buffer } from "buffer";
import { CustomClientOptions } from "./client";

/**
 * Base custom options for methods hitting the API.
 *
 * @property [endpointPath] - The relative URL path of the portal endpoint to contact.
 */
export type BaseCustomOptions = CustomClientOptions & {
  endpointPath?: string;
};

/**
 * Parse skylink options.
 *
 * @property [fromSubdomain] - Whether to parse the skylink as a base32 subdomain in a URL.
 * @property [includePath] - Whether to include the path after the skylink, e.g. /<skylink>/foo/bar.
 * @property [onlyPath] - Whether to parse out just the path, e.g. /foo/bar. Will still return null if the string does not contain a skylink.
 */
export type ParseSkylinkOptions = {
  fromSubdomain?: boolean;
  includePath?: boolean;
  onlyPath?: boolean;
};

type ParseSkylinkBase32Options = {
  onlyPath?: boolean;
};

export const defaultSkynetPortalUrl = "https://siasky.net";

export const uriHandshakePrefix = "hns:";
export const uriHandshakeResolverPrefix = "hnsres:";
export const uriSkynetPrefix = "sia:";

/**
 * The maximum allowed value for an entry revision. Setting an entry revision to this value prevents it from being updated further.
 */
export const MAX_REVISION = BigInt("18446744073709551615"); // max uint64

/**
 * Adds a subdomain to the given URL.
 *
 * @param url - The URL.
 * @param subdomain - The subdomain to add.
 * @returns - The final URL.
 */
export function addSubdomain(url: string, subdomain: string): string {
  const urlObj = new URL(url);
  urlObj.hostname = `${subdomain}.${urlObj.hostname}`;
  const str = urlObj.toString();
  return trimSuffix(str, "/");
}

/**
 * Adds a query to the given URL.
 *
 * @param url - The URL.
 * @param query - The query parameters.
 * @returns - The final URL.
 */
export function addUrlQuery(url: string, query: Record<string, unknown>): string {
  const parsed = parse(url, true);
  // Combine the desired query params with the already existing ones.
  query = { ...parsed.query, ...query };
  parsed.set("query", query);
  return parsed.toString();
}

/**
 * Checks if the provided bigint can fit in a 64-bit unsigned integer.
 *
 * @param int - The provided integer.
 * @throws - Will throw if the int does not fit in 64 bits.
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt/asUintN | MDN Demo}
 */
export function assertUint64(int: bigint): void {
  /* istanbul ignore next */
  if (typeof int !== "bigint") {
    throw new Error(`Expected parameter int to be type bigint, was type ${typeof int}`);
  }

  if (int < BigInt(0)) {
    throw new Error(`Argument ${int} must be an unsigned 64-bit integer; was negative`);
  }

  if (int > MAX_REVISION) {
    throw new Error(`Argument ${int} does not fit in a 64-bit unsigned integer; exceeds 2^64-1`);
  }
}

/**
 * Converts the given base64 skylink to base32.
 *
 * @param skylink - The base64 skylink.
 * @returns - The converted base32 skylink.
 */
export function convertSkylinkToBase32(skylink: string): string {
  const decoded = base64.toByteArray(skylink.padEnd(skylink.length + 4 - (skylink.length % 4), "="));
  return base32Encode(decoded, "RFC4648-HEX", { padding: false }).toLowerCase();
}

/**
 * Returns the default base custom options for the given endpoint path.
 *
 * @param endpointPath - The endpoint path.
 * @returns - The base custom options.
 */
export function defaultOptions(endpointPath: string): CustomClientOptions & { endpointPath: string } {
  return {
    endpointPath,
    APIKey: "",
    customUserAgent: "",
  };
}

// TODO: This will be smarter. See
// https://github.com/NebulousLabs/skynet-docs/issues/21.
/**
 * Returns the default portal URL.
 *
 * @returns - The portal URL.
 */
export function defaultPortalUrl(): string {
  /* istanbul ignore next */
  if (typeof window === "undefined") return "/"; // default to path root on ssr
  return window.location.origin;
}

/**
 * Gets the path for the file.
 *
 * @param file - The file.
 * @returns - The path.
 */
function getFilePath(
  file: File & {
    webkitRelativePath?: string;
    path?: string;
  }
): string {
  /* istanbul ignore next */
  return file.webkitRelativePath || file.path || file.name;
}

/**
 * Gets the file path relative to the root directory of the path, e.g. `bar` in `/foo/bar`.
 *
 * @param file - The input file.
 * @returns - The relative file path.
 */
export function getRelativeFilePath(file: File): string {
  const filePath = getFilePath(file);
  const { root, dir, base } = path.parse(filePath);
  const relative = path.normalize(dir).slice(root.length).split(path.sep).slice(1);

  return path.join(...relative, base);
}

/**
 * Gets the root directory of the file path, e.g. `foo` in `/foo/bar`.
 *
 * @param file - The input file.
 * @returns - The root directory.
 */
export function getRootDirectory(file: File): string {
  const filePath = getFilePath(file);
  const { root, dir } = path.parse(filePath);

  return path.normalize(dir).slice(root.length).split(path.sep)[0];
}

/**
 * Properly joins paths together to create a URL. Takes a variable number of
 * arguments.
 *
 * @param args - Array of URL parts to join.
 * @returns - Final URL constructed from the input parts.
 */
export function makeUrl(...args: string[]): string {
  return args.reduce((acc, cur) => urljoin(acc, cur));
}

const SKYLINK_MATCHER = "([a-zA-Z0-9_-]{46})";
const SKYLINK_MATCHER_SUBDOMAIN = "([a-z0-9_-]{55})";
const SKYLINK_DIRECT_REGEX = new RegExp(`^${SKYLINK_MATCHER}$`);
const SKYLINK_PATHNAME_REGEX = new RegExp(`^/?${SKYLINK_MATCHER}((/.*)?)$`);
const SKYLINK_SUBDOMAIN_REGEX = new RegExp(`^${SKYLINK_MATCHER_SUBDOMAIN}(\\..*)?$`);
const SKYLINK_DIRECT_MATCH_POSITION = 1;
const SKYLINK_PATH_MATCH_POSITION = 2;

/**
 * Parses the given string for a base64 skylink, or base32 if opts.fromSubdomain is given.
 *
 * @param skylinkUrl - Plain skylink, skylink with URI prefix, or URL with skylink as the first path element.
 * @param [opts] - Additional settings that can optionally be set.
 * @returns - The base64 (or base32) skylink, optionally with the path included.
 * @throws - Will throw on invalid combination of options.
 */
export function parseSkylink(skylinkUrl: string, opts: ParseSkylinkOptions = {}): string | null {
  if (typeof skylinkUrl !== "string") throw new Error(`Skylink has to be a string, ${typeof skylinkUrl} provided`);

  if (opts.includePath && opts.onlyPath) {
    throw new Error("The includePath and onlyPath options cannot both be set");
  }
  if (opts.includePath && opts.fromSubdomain) {
    throw new Error("The includePath and fromSubdomain options cannot both be set");
  }

  if (opts.fromSubdomain) {
    return parseSkylinkBase32(skylinkUrl, opts);
  }

  // Check for skylink prefixed with sia: or sia:// and extract it.
  // Example: sia:XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg
  // Example: sia://XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg
  skylinkUrl = trimUriPrefix(skylinkUrl, uriSkynetPrefix);

  // Check for direct base64 skylink match.
  const matchDirect = skylinkUrl.match(SKYLINK_DIRECT_REGEX);
  if (matchDirect) {
    if (opts.onlyPath) {
      return "";
    }
    return matchDirect[SKYLINK_DIRECT_MATCH_POSITION];
  }

  // Check for skylink passed in an url and extract it.
  // Example: https://siasky.net/XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg
  // Example: https://bg06v2tidkir84hg0s1s4t97jaeoaa1jse1svrad657u070c9calq4g.siasky.net (if opts.fromSubdomain = true)

  // Pass empty object as second param to disable using location as base url
  // when parsing in browser.
  const parsed = parse(skylinkUrl, {});
  const skylinkAndPath = trimSuffix(parsed.pathname, "/");
  const matchPathname = skylinkAndPath.match(SKYLINK_PATHNAME_REGEX);
  if (!matchPathname) return null;

  const path = matchPathname[SKYLINK_PATH_MATCH_POSITION];

  if (opts.includePath) return trimForwardSlash(skylinkAndPath);
  else if (opts.onlyPath) return path;
  else return matchPathname[SKYLINK_DIRECT_MATCH_POSITION];
}

/**
 * Parses the given string for a base32 skylink.
 *
 * @param skylinkUrl - Base32 skylink.
 * @param [opts] - Additional settings that can optionally be set.
 * @returns - The base32 skylink.
 */
export function parseSkylinkBase32(skylinkUrl: string, opts: ParseSkylinkBase32Options = {}): string | null {
  // Pass empty object as second param to disable using location as base url
  // when parsing in browser.
  const parsed = parse(skylinkUrl, {});

  // Check if the hostname contains a skylink subdomain.
  const matchHostname = parsed.hostname.match(SKYLINK_SUBDOMAIN_REGEX);
  if (matchHostname) {
    if (opts.onlyPath) {
      return trimSuffix(parsed.pathname, "/");
    }
    return matchHostname[SKYLINK_DIRECT_MATCH_POSITION];
  }

  return null;
}

/**
 * Removes a prefix from the beginning of the string.
 *
 * @param str - The string to process.
 * @returns - The processed string.
 */
export function trimForwardSlash(str: string): string {
  return trimPrefix(trimSuffix(str, "/"), "/");
}

/**
 * Removes a prefix from the beginning of the string.
 *
 * @param str - The string to process.
 * @param prefix - The prefix to remove.
 * @returns - The processed string.
 */
export function trimPrefix(str: string, prefix: string): string {
  while (str.startsWith(prefix)) {
    str = str.slice(prefix.length);
  }
  return str;
}

/**
 * Removes a suffix from the end of the string.
 *
 * @param str - The string to process.
 * @param suffix - The suffix to remove.
 * @returns - The processed string.
 */
function trimSuffix(str: string, suffix: string): string {
  while (str.endsWith(suffix)) {
    str = str.substring(0, str.length - suffix.length);
  }
  return str;
}

/**
 * Removes a URI prefix from the beginning of the string.
 *
 * @param str - The string to process.
 * @param prefix - The prefix to remove.
 * @returns - The processed string.
 */
export function trimUriPrefix(str: string, prefix: string): string {
  const longPrefix = `${prefix}//`;
  if (str.startsWith(longPrefix)) {
    // longPrefix is exactly at the beginning
    return str.slice(longPrefix.length);
  }
  if (str.startsWith(prefix)) {
    // else prefix is exactly at the beginning
    return str.slice(prefix.length);
  }
  return str;
}

/**
 * Converts a string to a uint8 array.
 *
 * @param str - The string to convert.
 * @returns - The uint8 array.
 */
export function stringToUint8Array(str: string): Uint8Array {
  /* istanbul ignore next */
  if (typeof str !== "string") {
    throw new Error(`Expected parameter str to be type string, was type ${typeof str}`);
  }

  return Uint8Array.from(Buffer.from(str));
}

/**
 * Converts a hex encoded string to a uint8 array
 *
 * @param str - The string to convert.
 * @returns - The uint8 array.
 * @throws - Will throw if the input is not a valid hex-encoded string.
 */
export function hexToUint8Array(str: string): Uint8Array {
  if (!isHexString(str)) {
    throw new Error(`Input string '${str}' is not a valid hex-encoded string`);
  }
  const matches = str.match(/.{1,2}/g);
  if (matches === null) {
    throw new Error(`Input string '${str}' is not a valid hex-encoded string`);
  }
  return new Uint8Array(matches.map((byte) => parseInt(byte, 16)));
}

/**
 * Returns true if the input is a valid hex-encoded string.
 *
 * @param str - The input string.
 * @returns - True if the input is hex-encoded.
 */
export function isHexString(str: string): boolean {
  /* istanbul ignore next */
  if (typeof str !== "string") {
    throw new Error(`Expected parameter str to be type string, was type ${typeof str}`);
  }

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

/**
 * Get the file mime type. In case the type is not provided, use mime-db and try
 * to guess the file type based on the extension.
 *
 * @param file - The file.
 * @returns - The mime type.
 */
export function getFileMimeType(file: File): string {
  if (file.type) return file.type;
  let { ext } = path.parse(file.name);
  ext = trimPrefix(ext, ".");
  if (ext !== "") {
    for (const type in mimeDB) {
      if (mimeDB[type]?.extensions?.includes(ext)) {
        return type;
      }
    }
  }
  return "";
}
