import base64 from "base64-js";
import base32Encode from "base32-encode";
import mimeDB from "mime-db";
import path from "path-browserify";
import parse from "url-parse";
import urljoin from "url-join";
import { Buffer } from "buffer";
import { CustomClientOptions } from "./client";

export type BaseCustomOptions = CustomClientOptions & {
  endpointPath?: string;
};

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

export function addSubdomain(url: string, subdomain: string): string {
  const urlObj = new URL(url);
  urlObj.hostname = `${subdomain}.${urlObj.hostname}`;
  const str = urlObj.toString();
  return trimSuffix(str, "/");
}

export function addUrlQuery(url: string, query: Record<string, unknown>): string {
  const parsed = parse(url, true);
  // Combine the desired query params with the already existing ones.
  query = { ...parsed.query, ...query };
  parsed.set("query", query);
  return parsed.toString();
}

export function convertSkylinkToBase32(input: string): string {
  const decoded = base64.toByteArray(input.padEnd(input.length + 4 - (input.length % 4), "="));
  return base32Encode(decoded, "RFC4648-HEX", { padding: false }).toLowerCase();
}

export function defaultOptions(endpointPath: string): BaseCustomOptions {
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
const SKYLINK_PATHNAME_REGEX = new RegExp(`^/?${SKYLINK_MATCHER}((/.*)?)$`);
const SKYLINK_SUBDOMAIN_REGEX = new RegExp(`^${SKYLINK_MATCHER_SUBDOMAIN}(\\..*)?$`);
const SKYLINK_DIRECT_MATCH_POSITION = 1;
const SKYLINK_PATH_MATCH_POSITION = 2;

/**
 * Parses the given string for a base64 skylink, or base32 if opts.fromSubdomain is given.
 * @param skylinkStr - plain skylink, skylink with URI prefix, or URL with skylink as the first path element.
 * @param [opts={}] - Additional settings that can optionally be set.
 * @param [opts.onlyPath=false] - Whether to parse out just the path, e.g. /foo/bar. Will still return null if the string does not contain a skylink.
 * @param [opts.includePath=false] - Whether to include the path after the skylink.
 * @param [opts.fromSubdomain=false] - Whether to parse the skylink as a base32 subdomain in a URL.
 */
export function parseSkylink(skylinkStr: string, opts?: ParseSkylinkOptions): string {
  opts = { ...opts };

  if (typeof skylinkStr !== "string") throw new Error(`Skylink has to be a string, ${typeof skylinkStr} provided`);

  if (opts.includePath && opts.onlyPath) {
    throw new Error("The includePath and onlyPath options cannot both be set");
  }
  if (opts.includePath && opts.fromSubdomain) {
    throw new Error("The includePath and fromSubdomain options cannot both be set");
  }

  if (opts.fromSubdomain) {
    return parseSkylinkBase32(skylinkStr, opts);
  }

  // Check for skylink prefixed with sia: or sia:// and extract it.
  // Example: sia:XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg
  // Example: sia://XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg
  skylinkStr = trimUriPrefix(skylinkStr, uriSkynetPrefix);

  // Check for direct base64 skylink match.
  const matchDirect = skylinkStr.match(SKYLINK_DIRECT_REGEX);
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
  const parsed = parse(skylinkStr, {});
  const skylinkAndPath = trimSuffix(parsed.pathname, "/");
  const matchPathname = skylinkAndPath.match(SKYLINK_PATHNAME_REGEX);
  if (!matchPathname) return null;

  const path = matchPathname[SKYLINK_PATH_MATCH_POSITION];

  if (opts.includePath) return trimForwardSlash(skylinkAndPath);
  else if (opts.onlyPath) return path;
  else return matchPathname[SKYLINK_DIRECT_MATCH_POSITION];
}

export function parseSkylinkBase32(skylinkStr: string, opts?: ParseSkylinkBase32Options): string {
  opts = { ...opts };

  // Pass empty object as second param to disable using location as base url
  // when parsing in browser.
  const parsed = parse(skylinkStr, {});

  // Check if the hostname contains a skylink subdomain.
  const matchHostname = parsed.hostname.match(SKYLINK_SUBDOMAIN_REGEX);
  if (matchHostname) {
    if (opts.onlyPath) {
      const path = trimSuffix(parsed.pathname, "/");
      return path;
    }
    return matchHostname[SKYLINK_DIRECT_MATCH_POSITION];
  }

  return null;
}

export function trimForwardSlash(str: string): string {
  return trimPrefix(trimSuffix(str, "/"), "/");
}

function trimPrefix(str: string, prefix: string): string {
  while (str.startsWith(prefix)) {
    str = str.slice(prefix.length);
  }
  return str;
}

function trimSuffix(str: string, suffix: string): string {
  while (str.endsWith(suffix)) {
    str = str.substring(0, str.length - suffix.length);
  }
  return str;
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

/**
 * Get the file mime type. In case the type is not provided, use mime-db and try
 * to guess the file type based on the extension.
 */
export function getFileMimeType(file: File): string {
  if (file.type) return file.type;
  let { ext } = path.parse(file.name);
  ext = trimPrefix(ext, ".");
  if (ext != "") {
    for (const type in mimeDB) {
      if (mimeDB[type]?.extensions?.includes(ext)) {
        return type;
      }
    }
  }
  return "";
}
