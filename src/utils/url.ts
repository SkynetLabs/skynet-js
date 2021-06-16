import parse from "url-parse";
import urljoin from "url-join";

import { trimForwardSlash, trimSuffix, trimUriPrefix } from "./string";
import { throwValidationError, validateString } from "./validation";

export const defaultSkynetPortalUrl = "https://siasky.net";

export const uriHandshakePrefix = "hns://";
export const uriSkynetPrefix = "sia://";

// TODO: This will be smarter. See
// https://github.com/SkynetLabs/skynet-docs/issues/5.
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
 * Adds a path to the given URL.
 *
 * @param url - The URL.
 * @param path - The given path.
 * @returns - The final URL.
 */
export function addPath(url: string, path: string): string {
  validateString("url", url, "parameter");
  validateString("path", path, "parameter");
  path = trimForwardSlash(path);

  let str;
  if (url === "localhost") {
    // Special handling for localhost.
    str = `localhost/${path}`;
  } else {
    // Construct a URL object and set the pathname property.
    const urlObj = new URL(url);
    urlObj.pathname = path;
    str = urlObj.toString();
  }

  return trimSuffix(str, "/");
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
 * Constructs the full URL for the given domain,
 * e.g. ("https://siasky.net", "dac.hns/path/file") => "https://dac.hns.siasky.net/path/file"
 *
 * @param portalUrl - The portal URL.
 * @param domain - Domain.
 * @returns - The full URL for the given domain.
 */
export function getFullDomainUrlForPortal(portalUrl: string, domain: string): string {
  validateString("portalUrl", portalUrl, "parameter");
  validateString("domain", domain, "parameter");

  domain = trimUriPrefix(domain, uriSkynetPrefix);
  domain = trimForwardSlash(domain);

  // Split on first / to get the path.
  let path;
  [domain, path] = domain.split(/\/(.+)/);

  // Add to subdomain.
  let url;
  if (domain === "localhost") {
    // Special handling for localhost.
    url = "localhost";
  } else {
    url = addSubdomain(portalUrl, domain);
  }
  // Add back the path if there was one.
  if (path) {
    url = addPath(url, path);
  }
  return url;
}

/**
 * Extracts the domain from the given portal URL,
 * e.g. ("https://siasky.net", "dac.hns.siasky.net/path/file") => "dac.hns/path/file"
 *
 * @param portalUrl - The portal URL.
 * @param fullDomain - Full URL.
 * @returns - The extracted domain.
 */
export function extractDomainForPortal(portalUrl: string, fullDomain: string): string {
  validateString("portalUrl", portalUrl, "parameter");
  validateString("fullDomain", fullDomain, "parameter");

  let path;
  try {
    // Try to extract the domain from the fullDomain.
    const fullDomainObj = new URL(fullDomain);
    fullDomain = fullDomainObj.hostname;
    path = fullDomainObj.pathname;
    path = trimForwardSlash(path);
  } catch {
    // If fullDomain is not a URL, ignore the error and use it as-is.
    //
    // Trim any slashes from the input URL.
    fullDomain = trimForwardSlash(fullDomain);
    // Split on first / to get the path.
    [fullDomain, path] = fullDomain.split(/\/(.+)/);
  }

  // Get the portal domain.
  const portalUrlObj = new URL(portalUrl);
  const portalDomain = trimForwardSlash(portalUrlObj.hostname);

  // Remove the portal domain from the domain.
  let domain = trimSuffix(fullDomain, portalDomain, 1);
  domain = trimSuffix(domain, ".");
  // Add back the path if there is one.
  if (path && path !== "") {
    path = trimForwardSlash(path);
    domain = `${domain}/${path}`;
  }
  return domain;
}
