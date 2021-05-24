import parse from "url-parse";
import { trimForwardSlash, trimSuffix, trimUriPrefix } from "../utils/string";
import { uriSkynetPrefix } from "../utils/url";
import { validateOptionalObject, validateString } from "../utils/validation";

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

const defaultParseSkylinkOptions = {
  fromSubdomain: false,
  includePath: false,
  onlyPath: false,
};

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
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - The base64 (or base32) skylink, optionally with the path included.
 * @throws - Will throw on invalid combination of options.
 */
export function parseSkylink(skylinkUrl: string, customOptions?: ParseSkylinkOptions): string | null {
  validateString("skylinkUrl", skylinkUrl, "parameter");
  validateOptionalObject("customOptions", customOptions, "parameter", defaultParseSkylinkOptions);

  const opts = { ...defaultParseSkylinkOptions, ...customOptions };

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
 * Helper function that parses the given string for a base32 skylink.
 *
 * @param skylinkUrl - Base32 skylink.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - The base32 skylink.
 */
export function parseSkylinkBase32(skylinkUrl: string, customOptions?: ParseSkylinkOptions): string | null {
  // Do not validate, this helper function should only be called from parseSkylink.

  const opts = { ...defaultParseSkylinkOptions, ...customOptions };

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
