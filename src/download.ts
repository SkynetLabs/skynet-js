import { SkynetClient } from "./client";
import {
  addSubdomain,
  addUrlQuery,
  convertSkylinkToBase32,
  defaultOptions,
  makeUrl,
  parseSkylink,
  trimUriPrefix,
  uriHandshakePrefix,
  uriHandshakeResolverPrefix,
} from "./utils";

const defaultDownloadOptions = {
  ...defaultOptions("/"),
};
const defaultDownloadHnsOptions = {
  ...defaultOptions("/hns"),
  hnsSubdomain: "hns",
};
const defaultResolveHnsOptions = {
  ...defaultOptions("/hnsres"),
};

/**
 * Initiates a download of the content of the skylink within the browser.
 * @param {string} skylink - 46 character skylink.
 * @param {Object} [customOptions={}] - Additional settings that can optionally be set.
 * @param {string} [customOptions.endpointPath="/"] - The relative URL path of the portal endpoint to contact.
 * @param {boolean} [customOptions.subdomain=false] - Whether to return the final skylink in subdomain format.
 */
export function downloadFile(this: SkynetClient, skylink: string, customOptions: any = {}): void {
  const opts = { ...defaultDownloadOptions, ...this.customOptions, ...customOptions, download: true };
  const url = this.getSkylinkUrl(skylink, opts);

  // Download the url.
  window.location.assign(url);
}

/**
 * Initiates a download of the content of the skylink at the Handshake domain.
 * @param {string} domain - Handshake domain.
 * @param {Object} [customOptions={}] - Additional settings that can optionally be set.
 * @param {string} [customOptions.endpointPath="/hns"] - The relative URL path of the portal endpoint to contact.
 * @param {boolean} [customOptions.subdomain=false] - Whether to return the final URL with the HNS domain as a subdomain.
 */
export async function downloadFileHns(this: SkynetClient, domain: string, customOptions: any = {}): Promise<void> {
  const opts = { ...defaultDownloadHnsOptions, ...this.customOptions, ...customOptions, download: true };
  const url = this.getHnsUrl(domain, opts);

  // Download the url.
  window.location.assign(url);
}

export function getSkylinkUrl(this: SkynetClient, skylink: string, customOptions: any = {}): string {
  const opts = { ...defaultDownloadOptions, ...this.customOptions, ...customOptions };
  const query = opts.download ? { attachment: true } : {};

  skylink = parseSkylink(skylink);
  if (opts.subdomain) {
    skylink = convertSkylinkToBase32(skylink);
  }
  const url = opts.subdomain
    ? addSubdomain(this.portalUrl, skylink)
    : makeUrl(this.portalUrl, opts.endpointPath, skylink);
  return addUrlQuery(url, query);
}

export function getHnsUrl(this: SkynetClient, domain: string, customOptions: any = {}): string {
  const opts = { ...defaultDownloadHnsOptions, ...this.customOptions, ...customOptions };
  const query = opts.download ? { attachment: true } : {};

  domain = trimUriPrefix(domain, uriHandshakePrefix);
  const url = opts.subdomain
    ? addSubdomain(addSubdomain(this.portalUrl, opts.hnsSubdomain), domain)
    : makeUrl(this.portalUrl, opts.endpointPath, domain);
  return addUrlQuery(url, query);
}

export function getHnsresUrl(this: SkynetClient, domain: string, customOptions: any = {}): string {
  const opts = { ...defaultResolveHnsOptions, ...this.customOptions, ...customOptions };

  domain = trimUriPrefix(domain, uriHandshakeResolverPrefix);
  return makeUrl(this.portalUrl, opts.endpointPath, domain);
}

export async function getMetadata(this: SkynetClient, skylink: string, customOptions: any = {}) {
  const opts = { ...defaultDownloadOptions, ...this.customOptions, ...customOptions };
  const url = this.getSkylinkUrl(skylink, opts);

  try {
    const response = await this.executeRequest({
      ...opts,
      method: "head",
      url,
    });

    return response.headers["skynet-file-metadata"] ? JSON.parse(response.headers["skynet-file-metadata"]) : {};
  } catch (error) {
    throw new Error("Error getting skynet-file-metadata from skylink");
  }
}

/**
 * Does a GET request of the skylink, returning the data property of the response.
 * @param {string} skylink - 46 character skylink.
 * @param {Object} [customOptions={}] - Additional settings that can optionally be set.
 * @param {string} [customOptions.endpointPath="/"] - The relative URL path of the portal endpoint to contact.
 */
export async function getFileContent(this: SkynetClient, skylink: string, customOptions: any = {}) {
  const opts = { ...defaultDownloadOptions, ...this.customOptions, ...customOptions };
  const url = this.getSkylinkUrl(skylink, opts);

  try {
    // GET request the skylink
    const response = await this.executeRequest({
      ...opts,
      method: "get",
      url,
    });

    return response.data;
  } catch (error) {
    throw new Error("Error requesting file from skylink");
  }
}

/**
 * Opens the content of the skylink within the browser.
 * @param {string} skylink - 46 character skylink.
 * @param {Object} [customOptions={}] - Additional settings that can optionally be set.
 * @param {string} [customOptions.endpointPath="/"] - The relative URL path of the portal endpoint to contact.
 */
export function openFile(this: SkynetClient, skylink: string, customOptions = {}): void {
  const opts = { ...defaultDownloadOptions, ...this.customOptions, ...customOptions };
  const url = this.getSkylinkUrl(skylink, opts);

  window.open(url, "_blank");
}

/**
 * Opens the content of the skylink from the given Handshake domain within the browser.
 * @param {string} domain - Handshake domain.
 * @param {Object} [customOptions={}] - Additional settings that can optionally be set.
 * @param {string} [customOptions.endpointPath="/hns"] - The relative URL path of the portal endpoint to contact.
 */
export async function openFileHns(this: SkynetClient, domain: string, customOptions = {}): Promise<void> {
  const opts = { ...defaultDownloadHnsOptions, ...this.customOptions, ...customOptions };
  const url = this.getHnsUrl(domain, opts);

  // Open the url in a new tab.
  window.open(url, "_blank");
}

/**
 * @param {string} domain - Handshake resolver domain.
 * @param {Object} [customOptions={}] - Additional settings that can optionally be set.
 * @param {string} [customOptions.endpointPath="/hnsres"] - The relative URL path of the portal endpoint to contact.
 */
export async function resolveHns(this: SkynetClient, domain: string, customOptions = {}): Promise<any> {
  const opts = { ...defaultResolveHnsOptions, ...this.customOptions, ...customOptions };
  const url = this.getHnsresUrl(domain, opts);

  // Get the txt record from the hnsres domain on the portal.
  const response = await this.executeRequest({
    ...opts,
    method: "get",
    url,
  });

  return response.data;
}
