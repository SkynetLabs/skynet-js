import base64 from "base64-js";
import base32Encode from "base32-encode";
import parse from "url-parse";
import { CustomClientOptions } from "../client";
import { trimForwardSlash, trimSuffix, trimUriPrefix } from "./string";

/**
 * Base custom options for methods hitting the API.
 *
 * @property [endpointPath] - The relative URL path of the portal endpoint to contact.
 * @property [query] - Query parameters.
 */
export type BaseCustomOptions = CustomClientOptions & {
  endpointPath?: string;
  query?: Record<string, unknown>;
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

export const uriHandshakePrefix = "hns:";
export const uriHandshakeResolverPrefix = "hnsres:";
export const uriSkynetPrefix = "sia://";
export const uriSkynsPrefix = "skyns://";

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

/**
 * Formats the skylink by adding the sia prefix.
 *
 * @param skylink - The skylink.
 * @returns - The formatted skylink.
 */
export function formatSkylink(skylink: string): string {
  if (skylink == "") {
    return skylink;
  }
  if (!skylink.startsWith(uriSkynetPrefix)) {
    skylink = `${uriSkynetPrefix}${skylink}`;
  }
  return skylink;
}

const SKYLINK_MATCHER = "([a-zA-Z0-9_-]{46})";
const SKYLINK_MATCHER_SUBDOMAIN = "([a-z0-9_-]{55})";
const SKYLINK_DIRECT_REGEX = new RegExp(`^${SKYLINK_MATCHER}$`);
const SKYLINK_PATHNAME_REGEX = new RegExp(`^/?${SKYLINK_MATCHER}((/.*)?)$`);
const SKYLINK_SUBDOMAIN_REGEX = new RegExp(`^${SKYLINK_MATCHER_SUBDOMAIN}(\\..*)?$`);
const SKYLINK_DIRECT_MATCH_POSITION = 1;
const SKYLINK_PATH_MATCH_POSITION = 2;

/**
 * Parses the given string for a base64 skylink, or base32 if opts.fromSubdomain is given. If the given string is prefixed with sia:, sia://, or a portal URL, those will be removed and the raw skylink returned.
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
