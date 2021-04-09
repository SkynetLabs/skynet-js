import parse from "url-parse";
import urljoin from "url-join";

import { isHexString, toHexString, trimPrefix, trimSuffix } from "./string";
import { defaultGetEntryOptions, CustomGetEntryOptions, MAX_GET_ENTRY_TIMEOUT } from "../registry";
import { hashDataKey } from "../crypto";
import { defaultDownloadOptions, CustomDownloadOptions } from "../download";
import { convertSkylinkToBase32, parseSkylink } from "./skylink";

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
  /* istanbul ignore next */
  if (typeof portalUrl !== "string") {
    throw new Error(`Expected parameter 'portalUrl' to be type string, was type ${typeof portalUrl}`);
  }
  /* istanbul ignore next */
  if (typeof publicKey !== "string") {
    throw new Error(`Expected parameter 'publicKey' to be type string, was type ${typeof publicKey}`);
  }
  /* istanbul ignore next */
  if (typeof dataKey !== "string") {
    throw new Error(`Expected parameter 'dataKey' to be type string, was type ${typeof dataKey}`);
  }

  const opts = {
    ...defaultGetEntryOptions,
    ...customOptions,
  };

  const timeout = opts.timeout;

  if (!Number.isInteger(timeout) || timeout > MAX_GET_ENTRY_TIMEOUT || timeout < 1) {
    throw new Error(
      `Invalid 'timeout' parameter '${timeout}', needs to be an integer between 1s and ${MAX_GET_ENTRY_TIMEOUT}s`
    );
  }

  // Trim the prefix if it was passed in.
  publicKey = trimPrefix(publicKey, "ed25519:");
  if (!isHexString(publicKey)) {
    throw new Error(`Given public key '${publicKey}' is not a valid hex-encoded string or contains an invalid prefix`);
  }

  // We need to hash the data key in order to form the correct URL, as Sia hashes whatever data key we give it.
  const dataKeyHash = toHexString(hashDataKey(dataKey));

  const query = {
    publickey: `ed25519:${publicKey}`,
    datakey: dataKeyHash,
    timeout,
  };

  let url = makeUrl(portalUrl, opts.endpointPath);
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
  /* istanbul ignore next */
  if (typeof portalUrl !== "string") {
    throw new Error(`Expected parameter 'portalUrl' to be type string, was type ${typeof portalUrl}`);
  }
  /* istanbul ignore next */
  if (typeof skylinkUrl !== "string") {
    throw new Error(`Expected parameter skylinkUrl to be type string, was type ${typeof skylinkUrl}`);
  }

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
    url = makeUrl(portalUrl, opts.endpointPath, skylink, path);
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
  domain = trimSuffix(domain, "/");
  return addSubdomain(portalUrl, domain);
}

// TODO: Expand to also take a fullURL instead of just a fullDomain.
/**
 * Extracts the domain from the given portal URL,
 * e.g. ("https://siasky.net", "dac.hns.siasky.net") => "dac.hns"
 *
 * @param portalUrl - The portal URL.
 * @param fullUrl - Full URL.
 * @returns - The extracted domain.
 */
export function extractDomainForPortal(portalUrl: string, fullDomain: string): string {
  const portalUrlObj = new URL(portalUrl);
  const portalDomain = portalUrlObj.hostname;

  const domain = trimSuffix(fullDomain, portalDomain, 1);
  return trimSuffix(domain, ".");
}
