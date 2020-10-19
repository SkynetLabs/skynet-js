import path from "path-browserify";
import parse from "url-parse";
import urljoin from "url-join";
import { Buffer } from "buffer";

export const defaultSkynetPortalUrl = "https://siasky.net";

export const uriHandshakePrefix = "hns:";
export const uriHandshakeResolverPrefix = "hnsres:";
export const uriSkynetPrefix = "sia:";

export function addUrlQuery(url: string, query: Record<string, unknown>): string {
  const parsed = parse(url);
  parsed.set("query", query);
  return parsed.toString();
}

export function defaultOptions(endpointPath: string): Record<string, unknown> {
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
const SKYLINK_DIRECT_REGEX = new RegExp(`^${SKYLINK_MATCHER}$`);
const SKYLINK_PATHNAME_REGEX = new RegExp(`^/?${SKYLINK_MATCHER}([/?].*)?$`);
const SKYLINK_REGEXP_MATCH_POSITION = 1;

export function parseSkylink(skylink: string): string {
  if (typeof skylink !== "string") throw new Error(`Skylink has to be a string, ${typeof skylink} provided`);

  // check for direct skylink match
  const matchDirect = skylink.match(SKYLINK_DIRECT_REGEX);
  if (matchDirect) return matchDirect[SKYLINK_REGEXP_MATCH_POSITION];

  // check for skylink prefixed with sia: or sia:// and extract it
  // example: sia:XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg
  // example: sia://XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg
  skylink = trimUriPrefix(skylink, uriSkynetPrefix);

  // check for skylink passed in an url and extract it
  // example: https://siasky.net/XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg

  // pass empty object as second param to disable using location as base url when parsing in browser
  const parsed = parse(skylink, {});
  const matchPathname = parsed.pathname.match(SKYLINK_PATHNAME_REGEX);
  if (matchPathname) return matchPathname[SKYLINK_REGEXP_MATCH_POSITION];

  throw new Error(`Could not extract skylink from '${skylink}'`);
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

export async function promiseTimeout(promise: any, ms: number) {
  const timeout = new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(`Timed out after ${ms}ms`);
    }, ms);
  });

  return Promise.race([promise, timeout]);
}

// stringToUint8Array converts a string to a uint8 array
export function stringToUint8Array(str: string): Uint8Array {
  return Uint8Array.from(Buffer.from(str));
}

// hexToUint8Array converts a hex encoded string to a uint8 array
export function hexToUint8Array(str: string): Uint8Array {
  return new Uint8Array(str.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));
}

// readData is a helper function that uses a FileReader to read the contents of
// the given file
export function readData(file: File): Promise<string | ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
}
