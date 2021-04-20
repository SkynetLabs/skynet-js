import parse from "url-parse";
import urljoin from "url-join";

import { isHexString, toHexString, trimPrefix, trimSuffix } from "./string";
import { defaultGetEntryOptions, CustomGetEntryOptions, DEFAULT_GET_ENTRY_TIMEOUT } from "../registry";
import { hashDataKey } from "../crypto";
import { defaultDownloadOptions, CustomDownloadOptions } from "../download";
import { convertSkylinkToBase32, parseSkylink } from "./skylink";
import { throwValidationError, validateOptionalObject, validateString } from "./validation";

export const defaultSkynetPortalUrl = "https://siasky.net";

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
 * Properly joins paths together to create a URL. Takes a variable number of
 * arguments.
 *
 * @param args - Array of URL parts to join.
 * @returns - Final URL constructed from the input parts.
 */
export function makeUrl(...args: string[]): string {
  if (args.length === 0) {
    throwValidationError("args", args, "parameter", "non-empty");
  }
  return args.reduce((acc, cur) => urljoin(acc, cur));
}

/**
 * Gets the registry entry URL without an initialized client.
 *
 * @param portalUrl - The portal URL.
 * @param publicKey - The user public key.
 * @param dataKey - The key of the data to fetch for the given user.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - The full get entry URL.
 * @throws - Will throw if the provided timeout is invalid or the given key is not valid.
 */
export function getEntryUrlForPortal(
  portalUrl: string,
  publicKey: string,
  dataKey: string,
  customOptions?: CustomGetEntryOptions
): string {
  validateString("portalUrl", portalUrl, "parameter");
  validateString("publicKey", publicKey, "parameter");
  validateString("dataKey", dataKey, "parameter");
  validateOptionalObject("customOptions", customOptions, "parameter", defaultGetEntryOptions);

  const opts = {
    ...defaultGetEntryOptions,
    ...customOptions,
  };

  // Trim the prefix if it was passed in.
  publicKey = trimPrefix(publicKey, "ed25519:");
  if (!isHexString(publicKey)) {
    throw new Error(`Given public key '${publicKey}' is not a valid hex-encoded string or contains an invalid prefix`);
  }

  // Hash and hex encode the given data key if it is not a hash already.
  let dataKeyHashHex = dataKey;
  if (!opts.hashedDataKeyHex) {
    dataKeyHashHex = toHexString(hashDataKey(dataKey));
  }

  const query = {
    publickey: `ed25519:${publicKey}`,
    datakey: dataKeyHashHex,
    timeout: DEFAULT_GET_ENTRY_TIMEOUT,
  };

  let url = makeUrl(portalUrl, opts.endpointGetEntry);
  url = addUrlQuery(url, query);

  return url;
}

/**
 * Gets the skylink URL without an initialized client.
 *
 * @param portalUrl - The portal URL.
 * @param skylinkUrl - Skylink string. See `downloadFile`.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - The full URL for the skylink.
 * @throws - Will throw if the skylinkUrl does not contain a skylink or if the path option is not a string.
 */
export function getSkylinkUrlForPortal(
  portalUrl: string,
  skylinkUrl: string,
  customOptions?: CustomDownloadOptions
): string {
  validateString("portalUrl", portalUrl, "parameter");
  validateString("skylinkUrl", skylinkUrl, "parameter");
  validateOptionalObject("customOptions", customOptions, "parameter", defaultDownloadOptions);

  const opts = { ...defaultDownloadOptions, ...customOptions };

  const query = opts.query ?? {};
  if (opts.download) {
    // Set the "attachment" parameter.
    query.attachment = true;
  }
  if (opts.noResponseMetadata) {
    // Set the "no-response-metadata" parameter.
    query["no-response-metadata"] = true;
  }

  // URL-encode the path.
  let path = "";
  if (opts.path) {
    if (typeof opts.path !== "string") {
      throw new Error(`opts.path has to be a string, ${typeof opts.path} provided`);
    }

    // Encode each element of the path separately and join them.
    //
    // Don't use encodeURI because it does not encode characters such as '?'
    // etc. These are allowed as filenames on Skynet and should be encoded so
    // they are not treated as URL separators.
    path = opts.path
      .split("/")
      .map((element: string) => encodeURIComponent(element))
      .join("/");
  }

  let url;
  if (opts.subdomain) {
    // Get the path from the skylink. Use the empty string if not found.
    const skylinkPath = parseSkylink(skylinkUrl, { onlyPath: true }) ?? "";
    // Get just the skylink.
    let skylink = parseSkylink(skylinkUrl);
    if (skylink === null) {
      throw new Error(`Could not get skylink out of input '${skylinkUrl}'`);
    }
    // Convert the skylink (without the path) to base32.
    skylink = convertSkylinkToBase32(skylink);
    url = addSubdomain(portalUrl, skylink);
    url = makeUrl(url, skylinkPath, path);
  } else {
    // Get the skylink including the path.
    const skylink = parseSkylink(skylinkUrl, { includePath: true });
    if (skylink === null) {
      throw new Error(`Could not get skylink with path out of input '${skylinkUrl}'`);
    }
    // Add additional path if passed in.
    url = makeUrl(portalUrl, opts.endpointDownload, skylink, path);
  }
  return addUrlQuery(url, query);
}

/**
 * Constructs the full URL for the given domain,
 * e.g. ("https://siasky.net", "dac.hns") => "https://dac.hns.siasky.net"
 *
 * @param portalUrl - The portal URL.
 * @param domain - Domain.
 * @returns - The full URL for the given domain.
 */
export function getFullDomainUrlForPortal(portalUrl: string, domain: string): string {
  validateString("portalUrl", portalUrl, "parameter");
  validateString("domain", domain, "parameter");

  domain = trimSuffix(domain, "/");
  return addSubdomain(portalUrl, domain);
}

/**
 * Extracts the domain from the given portal URL,
 * e.g. ("https://siasky.net", "dac.hns.siasky.net") => "dac.hns"
 *
 * @param portalUrl - The portal URL.
 * @param fullDomain - Full URL.
 * @returns - The extracted domain.
 */
export function extractDomainForPortal(portalUrl: string, fullDomain: string): string {
  validateString("portalUrl", portalUrl, "parameter");
  validateString("fullDomain", fullDomain, "parameter");

  // Try to extract the domain from the fullDomain.
  try {
    const fullDomainObj = new URL(fullDomain);
    fullDomain = fullDomainObj.hostname;
  } catch {
    // If fullDomain is not a URL, ignore the error and use it as-is.
  }

  // Trim any slashes from the input URL.
  fullDomain = trimSuffix(fullDomain, "/");

  // Get the portal domain.
  const portalUrlObj = new URL(portalUrl);
  const portalDomain = trimSuffix(portalUrlObj.hostname, "/");

  const domain = trimSuffix(fullDomain, portalDomain, 1);
  return trimSuffix(domain, ".");
}
