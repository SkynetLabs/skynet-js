import { SkynetClient } from "./client";
import {
  addSubdomain,
  addUrlQuery,
  BaseCustomOptions,
  convertSkylinkToBase32,
  defaultOptions,
  makeUrl,
  parseSkylink,
  trimUriPrefix,
  uriHandshakePrefix,
  uriHandshakeResolverPrefix,
} from "./utils";

/**
 * Custom download options.
 *
 * @property [download=false] - Indicates to `getSkylinkUrl` whether the file should be downloaded (true) or opened in the browser (false). `downloadFile` and `openFile` override this value.
 * @property [path=""] - A path to append to the skylink, e.g. `dir1/dir2/file`. A Unix-style path is expected. Each path component will be URL-encoded.
 * @property [query={}] - A query object to convert to a query parameter string and append to the URL.
 * @property [subdomain=false] - Whether to return the final skylink in subdomain format.
 */
export type CustomDownloadOptions = BaseCustomOptions & {
  download?: boolean;
  path?: string;
  query?: Record<string, unknown>;
  subdomain?: boolean;
};

/**
 * Custom HNS download options.
 *
 * @property [hnsSubdomain="hns"] - The name of the hns subdomain on the portal.
 */
export type CustomHnsDownloadOptions = CustomDownloadOptions & {
  hnsSubdomain?: string;
};

/**
 * The response for a resolve HNS request.
 *
 * @property skylink - 46-character skylink.
 */
export type ResolveHnsResponse = {
  skylink: string;
};

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
 *
 * @param this - SkynetClient
 * @param skylinkUrl - 46-character skylink, or a valid skylink URL. Can be followed by a path. Note that the skylink will not be encoded, so if your path might contain special characters, consider using `customOptions.path`.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @param [customOptions.endpointPath="/"] - The relative URL path of the portal endpoint to contact.
 * @returns - The full URL that was used.
 * @throws - Will throw if the skylinkUrl does not contain a skylink or if the path option is not a string.
 */
export function downloadFile(this: SkynetClient, skylinkUrl: string, customOptions?: CustomDownloadOptions): string {
  const opts = { ...defaultDownloadOptions, ...this.customOptions, ...customOptions, download: true };
  const url = this.getSkylinkUrl(skylinkUrl, opts);

  // Download the url.
  window.location.assign(url);

  return url;
}

/**
 * Initiates a download of the content of the skylink at the Handshake domain.
 *
 * @param this - SkynetClient
 * @param domain - Handshake domain.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @param [customOptions.endpointPath="/hns"] - The relative URL path of the portal endpoint to contact.
 * @returns - The full URL that was used.
 */
export async function downloadFileHns(
  this: SkynetClient,
  domain: string,
  customOptions?: CustomDownloadOptions
): Promise<string> {
  const opts = { ...defaultDownloadHnsOptions, ...this.customOptions, ...customOptions, download: true };
  const url = this.getHnsUrl(domain, opts);

  // Download the url.
  window.location.assign(url);

  return url;
}

/**
 * Constructs the full URL for the given skylink.
 *
 * @param this - SkynetClient
 * @param skylinkUrl - Skylink string. See `downloadFile`.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @param [customOptions.endpointPath="/"] - The relative URL path of the portal endpoint to contact.
 * @returns - The full URL for the skylink.
 * @throws - Will throw if the skylinkUrl does not contain a skylink or if the path option is not a string.
 */
export function getSkylinkUrl(this: SkynetClient, skylinkUrl: string, customOptions?: CustomDownloadOptions): string {
  const opts = { ...defaultDownloadOptions, ...this.customOptions, ...customOptions };
  const query = opts.query ?? {};
  if (opts.download) {
    query.attachment = true;
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
    url = addSubdomain(this.portalUrl, skylink);
    url = makeUrl(url, skylinkPath, path);
  } else {
    // Get the skylink including the path.
    const skylink = parseSkylink(skylinkUrl, { includePath: true });
    if (skylink === null) {
      throw new Error(`Could not get skylink with path out of input '${skylinkUrl}'`);
    }
    // Add additional path if passed in.
    url = makeUrl(this.portalUrl, opts.endpointPath, skylink, path);
  }
  return addUrlQuery(url, query);
}

/**
 * Constructs the full URL for the given HNS domain.
 *
 * @param this - SkynetClient
 * @param domain - Handshake domain.
 * @param [customOptions={}] - Additional settings that can optionally be set.
 * @param [customOptions.endpointPath="/hns"] - The relative URL path of the portal endpoint to contact.
 * @returns - The full URL for the HNS domain.
 */
export function getHnsUrl(this: SkynetClient, domain: string, customOptions?: CustomHnsDownloadOptions): string {
  const opts = { ...defaultDownloadHnsOptions, ...this.customOptions, ...customOptions };
  const query = opts.query ?? {};
  if (opts.download) {
    query.attachment = true;
  }

  domain = trimUriPrefix(domain, uriHandshakePrefix);
  const url = opts.subdomain
    ? addSubdomain(addSubdomain(this.portalUrl, opts.hnsSubdomain), domain)
    : makeUrl(this.portalUrl, opts.endpointPath, domain);
  return addUrlQuery(url, query);
}

/**
 * Constructs the full URL for the resolver for the given HNS domain.
 *
 * @param this - SkynetClient
 * @param domain - Handshake domain.
 * @param [customOptions={}] - Additional settings that can optionally be set.
 * @param [customOptions.endpointPath="/hnsres"] - The relative URL path of the portal endpoint to contact.
 * @returns - The full URL for the resolver for the HNS domain.
 */
export function getHnsresUrl(this: SkynetClient, domain: string, customOptions?: BaseCustomOptions): string {
  const opts = { ...defaultResolveHnsOptions, ...this.customOptions, ...customOptions };

  domain = trimUriPrefix(domain, uriHandshakeResolverPrefix);
  return makeUrl(this.portalUrl, opts.endpointPath, domain);
}

/**
 * Gets only the metadata for the given skylink without the contents.
 *
 * @param this - SkynetClient
 * @param skylinkUrl - Skylink string. See `downloadFile`.
 * @param [customOptions] - Additional settings that can optionally be set. See `downloadFile` for the full list.
 * @param [customOptions.endpointPath="/"] - The relative URL path of the portal endpoint to contact.
 * @returns - The metadata in JSON format.
 * @throws - Will throw if the skylinkUrl does not contain a skylink or if the path option is not a string.
 */
export async function getMetadata(
  this: SkynetClient,
  skylinkUrl: string,
  customOptions?: CustomDownloadOptions
): Promise<Record<string, unknown>> {
  const opts = { ...defaultDownloadOptions, ...this.customOptions, ...customOptions };
  const url = this.getSkylinkUrl(skylinkUrl, opts);

  const response = await this.executeRequest({
    ...opts,
    method: "head",
    url,
  });

  return response.headers["skynet-file-metadata"] ? JSON.parse(response.headers["skynet-file-metadata"]) : {};
}

/**
 * Does a GET request of the skylink, returning the data property of the response.
 *
 * @param this - SkynetClient
 * @param skylink - 46 character skylink.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @param [customOptions.endpointPath="/"] - The relative URL path of the portal endpoint to contact.
 * @returns - The content of the file.
 * @throws - Will throw if the skylinkUrl does not contain a skylink or if the path option is not a string.
 */
export async function getFileContent(
  this: SkynetClient,
  skylink: string,
  customOptions?: CustomDownloadOptions
): Promise<Record<string, unknown>> {
  const opts = { ...defaultDownloadOptions, ...this.customOptions, ...customOptions };
  const url = this.getSkylinkUrl(skylink, opts);

  // GET request the skylink
  const response = await this.executeRequest({
    ...opts,
    method: "get",
    url,
  });

  return response.data;
}

/**
 * Opens the content of the skylink within the browser.
 *
 * @param this - SkynetClient
 * @param skylinkUrl - Skylink string. See `downloadFile`.
 * @param [customOptions] - Additional settings that can optionally be set. See `downloadFile` for the full list.
 * @param [customOptions.endpointPath="/"] - The relative URL path of the portal endpoint to contact.
 * @returns - The full URL that was used.
 * @throws - Will throw if the skylinkUrl does not contain a skylink or if the path option is not a string.
 */
export function openFile(this: SkynetClient, skylinkUrl: string, customOptions?: CustomDownloadOptions): string {
  const opts = { ...defaultDownloadOptions, ...this.customOptions, ...customOptions };
  const url = this.getSkylinkUrl(skylinkUrl, opts);

  window.open(url, "_blank");

  return url;
}

/**
 * Opens the content of the skylink from the given Handshake domain within the browser.
 *
 * @param this - SkynetClient
 * @param domain - Handshake domain.
 * @param [customOptions] - Additional settings that can optionally be set. See `downloadFileHns` for the full list.
 * @param [customOptions.endpointPath="/hns"] - The relative URL path of the portal endpoint to contact.
 * @returns - The full URL that was used.
 */
export async function openFileHns(
  this: SkynetClient,
  domain: string,
  customOptions?: CustomHnsDownloadOptions
): Promise<string> {
  const opts = { ...defaultDownloadHnsOptions, ...this.customOptions, ...customOptions };
  const url = this.getHnsUrl(domain, opts);

  // Open the url in a new tab.
  window.open(url, "_blank");

  return url;
}

/**
 * Resolves the given HNS domain to its TXT record and returns the data.
 *
 * @param this - SkynetClient
 * @param domain - Handshake resolver domain.
 * @param [customOptions={}] - Additional settings that can optionally be set.
 * @param [customOptions.endpointPath="/hnsres"] - The relative URL path of the portal endpoint to contact.
 * @returns - The data for the TXT record.
 */
export async function resolveHns(
  this: SkynetClient,
  domain: string,
  customOptions?: BaseCustomOptions
): Promise<ResolveHnsResponse> {
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
