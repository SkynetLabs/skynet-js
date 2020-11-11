import base64 from "base64-js";
import base32Encode from "base32-encode";
import mimeDB from "mime-db";
import path from "path-browserify";
import parse from "url-parse";
import urljoin from "url-join";
import { Buffer } from "buffer";

export const defaultSkynetPortalUrl = "https://siasky.net";

export const uriHandshakePrefix = "hns:";
export const uriHandshakeResolverPrefix = "hnsres:";
export const uriSkynetPrefix = "sia:";

// TODO: Use a third-party library to make this more robust.
export function addSubdomain(url: string, subdomain: string): string {
  const urlObj = new URL(url);
  urlObj.hostname = `${subdomain}.${urlObj.hostname}`;
  const str = urlObj.toString();
  if (str.endsWith("/")) {
    return str.substring(0, str.length - 1);
  }
  return str;
}

export function addUrlQuery(url: string, query: Record<string, unknown>): string {
  const parsed = parse(url);
  parsed.set("query", query);
  return parsed.toString();
}

export function convertSkylinkToBase32(input: string): string {
  const decoded = base64.toByteArray(input.padEnd(input.length + 4 - (input.length % 4), "="));
  return base32Encode(decoded, "RFC4648-HEX", { padding: false }).toLowerCase();
}

export function defaultOptions(endpointPath: string) {
  return {
    endpointPath,
    APIKey: "",
    customUserAgent: "",
  };
}

// TODO: This will be smarter. See
// https://github.com/NebulousLabs/skynet-docs/issues/21.
export function defaultPortalUrl(): string {
  if (typeof window === "undefined") return "/"; // default to path root on ssr
  return window.location.origin;
}

function getFilePath(
  file: File & {
    webkitRelativePath?: string;
    path?: string;
  }
): string {
  return file.webkitRelativePath || file.path || file.name;
}

export function getRelativeFilePath(file: File): string {
  const filePath = getFilePath(file);
  const { root, dir, base } = path.parse(filePath);
  const relative = path.normalize(dir).slice(root.length).split(path.sep).slice(1);

  return path.join(...relative, base);
}

export function getRootDirectory(file: File): string {
  const filePath = getFilePath(file);
  const { root, dir } = path.parse(filePath);

  return path.normalize(dir).slice(root.length).split(path.sep)[0];
}

/**
 * Properly joins paths together to create a URL. Takes a variable number of
 * arguments.
 */
export function makeUrl(...args: string[]): string {
  return args.reduce((acc, cur) => urljoin(acc, cur));
}

const SKYLINK_MATCHER = "([a-zA-Z0-9_-]{46})";
const SKYLINK_MATCHER_SUBDOMAIN = "([a-z0-9_-]{55})";
const SKYLINK_DIRECT_REGEX = new RegExp(`^${SKYLINK_MATCHER}$`);
// const SKYLINK_SUBDOMAIN_PATHNAME_REGEX = new RegExp(`^${SKYLINK_MATCHER}(`);
const SKYLINK_PATHNAME_REGEX = new RegExp(`^/?${SKYLINK_MATCHER}(/.*)?$`);
const SKYLINK_SUBDOMAIN_REGEX = new RegExp(`^/?${SKYLINK_MATCHER_SUBDOMAIN}(\\..*)?$`);
const SKYLINK_REGEXP_MATCH_POSITION = 1;

/**
 * Parses the given string for a base64 skylink, or base32 if opts.subdomain is given.
 * @param skylinkStr - plain skylink, skylink with URI prefix, or URL with skylink as the first path element.
 * @param [opts={}] - Additional settings that can optionally be set.
 * @param [opts.subdomain=false] - Whether to parse the skylink as a base32 subdomain in a URL.
 */
export function parseSkylink(skylinkStr: string, opts: any = {}): string {
  if (typeof skylinkStr !== "string") throw new Error(`Skylink has to be a string, ${typeof skylinkStr} provided`);

  if (opts.subdomain) {
    return parseSkylinkBase32(skylinkStr);
  }

  let hasSkynetPrefix = false;

  // Check for skylink prefixed with sia: or sia:// and extract it.
  // Example: sia:XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg
  // Example: sia://XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg
  if (skylinkStr.startsWith(uriSkynetPrefix)) {
    skylinkStr = trimUriPrefix(skylinkStr, uriSkynetPrefix);
    hasSkynetPrefix = true;
  }

  // Check for direct base64 skylink match.
  const matchDirect = skylinkStr.match(SKYLINK_DIRECT_REGEX);
  if (matchDirect) return matchDirect[SKYLINK_REGEXP_MATCH_POSITION];

  if (hasSkynetPrefix) {
    throw new Error(`String '${skylinkStr} had ${uriSkynetPrefix} prefix but did not contain a 46-character skylink`);
  }

  // Check for skylink passed in an url and extract it.
  // Example: https://siasky.net/XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg
  // Example: https://bg06v2tidkir84hg0s1s4t97jaeoaa1jse1svrad657u070c9calq4g.siasky.net (if opts.subdomain = true)

  // Pass empty object as second param to disable using location as base url when parsing in browser.
  const parsed = parse(skylinkStr, {});
  const matchPathname = parsed.pathname.match(SKYLINK_PATHNAME_REGEX);
  if (matchPathname) return matchPathname[SKYLINK_REGEXP_MATCH_POSITION];

  throw new Error(`Could not extract skylink from '${skylinkStr}'`);
}

function parseSkylinkBase32(skylinkStr: string): string {
  // Pass empty object as second param to disable using location as base url when parsing in browser.
  const parsed = parse(skylinkStr, {});
  const matchHostname = parsed.hostname.match(SKYLINK_SUBDOMAIN_REGEX);
  if (matchHostname) return matchHostname[SKYLINK_REGEXP_MATCH_POSITION];

  throw new Error(`Could not extract skylink from '${skylinkStr}'`);
}

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

export function randomNumber(low: number, high: number): number {
  return Math.random() * (high - low) + low;
}

// Converts a string to a uint8 array
export function stringToUint8Array(str: string): Uint8Array {
  return Uint8Array.from(Buffer.from(str));
}

// Converts a hex encoded string to a uint8 array
export function hexToUint8Array(str: string): Uint8Array {
  return new Uint8Array(str.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));
}

/**
 * Convert a byte array to a hex string.
 * From https://stackoverflow.com/a/44608819.
 */
export function toHexString(byteArray: Uint8Array): string {
  let s = "";
  byteArray.forEach(function (byte) {
    s += ("0" + (byte & 0xff).toString(16)).slice(-2);
  });
  return s;
}

// A helper function that uses a FileReader to read the contents of the given
// file
export function readData(file: File): Promise<string | ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Get the file mime type. In case the type is not provided, use mime-db and try
 * to guess the file type based on the extension.
 */
export function getFileMimeType(file: File): string {
  if (file.type) return file.type;
  const extension = file.name.slice(file.name.lastIndexOf(".") + 1);
  if (extension) {
    for (const type in mimeDB) {
      if (mimeDB[type]?.extensions?.includes(extension)) {
        return type;
      }
    }
  }
  return "";
}
