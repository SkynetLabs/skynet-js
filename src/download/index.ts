import { AxiosResponse } from "axios";
import { SkynetClient } from "../client";
import {
  BaseCustomOptions,
  convertSkylinkToBase32,
  defaultOptions,
  formatSkylink,
  parseSkylink,
  uriHandshakePrefix,
  uriHandshakeResolverPrefix,
} from "../utils/skylink";
import { trimUriPrefix } from "../utils/string";
import { addSubdomain, addUrlQuery, makeUrl } from "../utils/url";

/**
 * Custom download options.
 *
 * @property [download=false] - Indicates to `getSkylinkUrl` whether the file should be downloaded (true) or opened in the browser (false). `downloadFile` and `openFile` override this value.
 * @property [noResponseMetadata=false] - Download without metadata in the response.
 * @property [path=""] - A path to append to the skylink, e.g. `dir1/dir2/file`. A Unix-style path is expected. Each path component will be URL-encoded.
 * @property [query={}] - A query object to convert to a query parameter string and append to the URL.
 * @property [subdomain=false] - Whether to return the final skylink in subdomain format.
 */
export type CustomDownloadOptions = BaseCustomOptions & {
  download?: boolean;
  noResponseMetadata?: boolean;
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
 * The response for a get file content request.
 *
 * @property data - The returned file content. Its type is stored in contentType.
 * @property contentType - The type of the content.
 * @property metadata - The metadata in JSON format.
 * @property portalUrl - The URL of the portal.
 * @property skylink - 46-character skylink.
 */
export type GetFileContentResponse<T = unknown> = {
  data: T;
  contentType: string;
  metadata: Record<string, unknown>;
  portalUrl: string;
  skylink: string;
};

/**
 * The response for a get metadata request.
 *
 * @property contentType - The type of the content.
 * @property metadata - The metadata in JSON format.
 * @property portalUrl - The URL of the portal.
 * @property skylink - 46-character skylink.
 */
export type GetMetadataResponse = {
  contentType: string;
  metadata: Record<string, unknown>;
  portalUrl: string;
  skylink: string;
};

/**
 * The response for a resolve HNS request.
 *
 * @property skylink - 46-character skylink.
 */
export type ResolveHnsResponse = {
  skylink: string;
};

export const defaultDownloadOptions = {
  ...defaultOptions("/"),
};
export const defaultDownloadHnsOptions = {
  ...defaultOptions("/hns"),
  hnsSubdomain: "hns",
};
export const defaultResolveHnsOptions = {
  ...defaultOptions("/hnsres"),
};

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
  /* istanbul ignore next */
  if (typeof skylinkUrl !== "string") {
    throw new Error(`Expected parameter skylinkUrl to be type string, was type ${typeof skylinkUrl}`);
  }

  const opts = { ...defaultDownloadOptions, ...this.customOptions, ...customOptions };
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
 * @throws - Will throw if the input domain is not a string.
 */
export function getHnsUrl(this: SkynetClient, domain: string, customOptions?: CustomHnsDownloadOptions): string {
  /* istanbul ignore next */
  if (typeof domain !== "string") {
    throw new Error(`Expected parameter domain to be type string, was type ${typeof domain}`);
  }

  const opts = { ...defaultDownloadHnsOptions, ...this.customOptions, ...customOptions };
  const query = opts.query ?? {};
  if (opts.download) {
    query.attachment = true;
  }
  if (opts.noResponseMetadata) {
    query["no-response-metadata"] = true;
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
 * @throws - Will throw if the input domain is not a string.
 */
export function getHnsresUrl(this: SkynetClient, domain: string, customOptions?: BaseCustomOptions): string {
  /* istanbul ignore next */
  if (typeof domain !== "string") {
    throw new Error(`Expected parameter domain to be type string, was type ${typeof domain}`);
  }

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
 * @returns - The metadata in JSON format. Each field will be empty if no metadata was found.
 * @throws - Will throw if the skylinkUrl does not contain a skylink or if the path option is not a string.
 */
export async function getMetadata(
  this: SkynetClient,
  skylinkUrl: string,
  customOptions?: CustomDownloadOptions
): Promise<GetMetadataResponse> {
  /* istanbul ignore next */
  if (typeof skylinkUrl !== "string") {
    throw new Error(`Expected parameter skylinkUrl to be type string, was type ${typeof skylinkUrl}`);
  }

  const opts = { ...defaultDownloadOptions, ...this.customOptions, ...customOptions };
  const url = this.getSkylinkUrl(skylinkUrl, opts);

  const response = await this.executeRequest({
    ...opts,
    method: "head",
    url,
  });

  return getDownloadHeaders(response);
}

/**
 * Gets the contents of the file at the given skylink.
 *
 * @param this - SkynetClient
 * @param skylinkUrl - Skylink string. See `downloadFile`.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @param [customOptions.endpointPath="/"] - The relative URL path of the portal endpoint to contact.
 * @returns - An object containing the data of the file, the content-type, metadata, and the file's skylink.
 * @throws - Will throw if the skylinkUrl does not contain a skylink or if the path option is not a string.
 */
export async function getFileContent<T = unknown>(
  this: SkynetClient,
  skylinkUrl: string,
  customOptions?: CustomDownloadOptions
): Promise<GetFileContentResponse<T>> {
  /* istanbul ignore next */
  if (typeof skylinkUrl !== "string") {
    throw new Error(`Expected parameter skylinkUrl to be type string, was type ${typeof skylinkUrl}`);
  }

  const opts = { ...defaultDownloadOptions, ...this.customOptions, ...customOptions };
  const url = this.getSkylinkUrl(skylinkUrl, opts);

  return this.getFileContentRequest<T>(url, opts);
}

/**
 * Gets the contents of the file at the given Handshake domain.
 *
 * @param this - SkynetClient
 * @param domain - Handshake domain.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @param [customOptions.endpointPath="/hns"] - The relative URL path of the portal endpoint to contact.
 * @returns - An object containing the data of the file, the content-type, metadata, and the file's skylink.
 * @throws - Will throw if the domain does not contain a skylink.
 */
export async function getFileContentHns<T = unknown>(
  this: SkynetClient,
  domain: string,
  customOptions?: CustomHnsDownloadOptions
): Promise<GetFileContentResponse<T>> {
  const opts = { ...defaultDownloadHnsOptions, ...this.customOptions, ...customOptions };
  const url = this.getHnsUrl(domain, opts);

  return this.getFileContentRequest<T>(url, opts);
}

/**
 * Does a GET request of the skylink, returning the data property of the response.
 *
 * @param this - SkynetClient
 * @param url - URL.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - An object containing the data of the file, the content-type, metadata, and the file's skylink.
 * @throws - Will throw if the request does not succeed or the response is missing data.
 */
export async function getFileContentRequest<T = unknown>(
  this: SkynetClient,
  url: string,
  customOptions?: CustomDownloadOptions
): Promise<GetFileContentResponse<T>> {
  const opts = { ...defaultDownloadOptions, ...this.customOptions, ...customOptions };

  // GET request the data at the skylink.
  const response = await this.executeRequest({
    ...opts,
    method: "get",
    url,
  });

  if (typeof response.data === "undefined") {
    throw new Error(
      "Did not get 'data' in response despite a successful request. Please try again and report this issue to the devs if it persists."
    );
  }

  const headers = getDownloadHeaders(response);

  return { ...headers, data: response.data };
}

/**
 * Resolves the given HNS domain to its TXT record and returns the data.
 *
 * @param this - SkynetClient
 * @param domain - Handshake resolver domain.
 * @param [customOptions={}] - Additional settings that can optionally be set.
 * @param [customOptions.endpointPath="/hnsres"] - The relative URL path of the portal endpoint to contact.
 * @returns - The data for the TXT record.
 * @throws - Will throw if the input domain is not a string.
 */
export async function resolveHns(
  this: SkynetClient,
  domain: string,
  customOptions?: BaseCustomOptions
): Promise<ResolveHnsResponse> {
  /* istanbul ignore next */
  if (typeof domain !== "string") {
    throw new Error(`Expected parameter domain to be type string, was type ${typeof domain}`);
  }

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

/**
 * Gets the common download metadata headers from the Axios response.
 *
 * @param response - The Axios response.
 * @returns - The metadata headers for the download.
 * @throws - Will throw if headers are not available on the response.
 */
export function getDownloadHeaders(response: AxiosResponse): GetMetadataResponse {
  /* istanbul ignore next */
  if (typeof response.headers === "undefined") {
    throw new Error(
      "Did not get 'headers' in response despite a successful request. Please try again and report this issue to the devs if it persists."
    );
  }

  const contentType = response.headers["content-type"] ?? "";
  const metadata = response.headers["skynet-file-metadata"] ? JSON.parse(response.headers["skynet-file-metadata"]) : {};
  const portalUrl = response.headers["skynet-portal-api"] ?? "";
  const skylink = response.headers["skynet-skylink"] ? formatSkylink(response.headers["skynet-skylink"]) : "";

  return { contentType, metadata, portalUrl, skylink };
}
