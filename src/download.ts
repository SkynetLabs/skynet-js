import { AxiosResponse, ResponseType } from "axios";

import { Headers, SkynetClient } from "./client";
import { getEntryLink, validateRegistryProof } from "./registry";
import { convertSkylinkToBase32, formatSkylink } from "./skylink/format";
import { parseSkylink } from "./skylink/parse";
import { isSkylinkV1 } from "./skylink/sia";
import { BaseCustomOptions, DEFAULT_BASE_OPTIONS } from "./utils/options";
import { trimUriPrefix } from "./utils/string";
import { addSubdomain, addUrlQuery, makeUrl, URI_HANDSHAKE_PREFIX } from "./utils/url";
import {
  throwValidationError,
  validateObject,
  validateOptionalObject,
  validateSkylinkString,
  validateString,
} from "./utils/validation";
import { JsonData } from "./utils/types";

/**
 * Custom download options.
 *
 * @property [endpointDownload] - The relative URL path of the portal endpoint to contact.
 * @property [download=false] - Indicates to `getSkylinkUrl` whether the file should be downloaded (true) or opened in the browser (false). `downloadFile` and `openFile` override this value.
 * @property [path] - A path to append to the skylink, e.g. `dir1/dir2/file`. A Unix-style path is expected. Each path component will be URL-encoded.
 * @property [range] - The Range request header to set for the download. Not applicable for in-borwser downloads.
 * @property [responseType] - The response type.
 * @property [subdomain=false] - Whether to return the final skylink in subdomain format.
 */
export type CustomDownloadOptions = BaseCustomOptions & {
  endpointDownload?: string;
  download?: boolean;
  path?: string;
  range?: string;
  responseType?: ResponseType;
  subdomain?: boolean;
};

/**
 * Custom HNS download options.
 *
 * @property [endpointDownloadHns] - The relative URL path of the portal endpoint to contact.
 * @property [hnsSubdomain="hns"] - The name of the hns subdomain on the portal.
 */
export type CustomHnsDownloadOptions = CustomDownloadOptions & {
  endpointDownloadHns?: string;
  hnsSubdomain?: string;
};

export type CustomGetMetadataOptions = BaseCustomOptions & {
  endpointGetMetadata?: string;
};

export type CustomHnsResolveOptions = BaseCustomOptions & {
  endpointResolveHns?: string;
};

/**
 * The response for a get file content request.
 *
 * @property data - The returned file content. Its type is stored in contentType.
 * @property contentType - The type of the content.
 * @property portalUrl - The URL of the portal.
 * @property skylink - 46-character skylink.
 */
export type GetFileContentResponse<T = unknown> = {
  data: T;
  contentType: string;
  portalUrl: string;
  skylink: string;
};

/**
 * The response for a get metadata request.
 *
 * @property metadata - The metadata in JSON format.
 * @property portalUrl - The URL of the portal.
 * @property skylink - 46-character skylink.
 */
export type GetMetadataResponse = {
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
  data: JsonData;
  skylink: string;
};

export const DEFAULT_DOWNLOAD_OPTIONS = {
  ...DEFAULT_BASE_OPTIONS,
  endpointDownload: "/",
  download: false,
  path: undefined,
  range: undefined,
  responseType: undefined,
  subdomain: false,
};

const DEFAULT_GET_METADATA_OPTIONS = {
  ...DEFAULT_BASE_OPTIONS,
  endpointGetMetadata: "/skynet/metadata",
};

const DEFAULT_DOWNLOAD_HNS_OPTIONS = {
  ...DEFAULT_DOWNLOAD_OPTIONS,
  endpointDownloadHns: "hns",
  hnsSubdomain: "hns",
  // Default to subdomain format for HNS URLs.
  subdomain: true,
};

const DEFAULT_RESOLVE_HNS_OPTIONS = {
  ...DEFAULT_BASE_OPTIONS,
  endpointResolveHns: "hnsres",
};

/**
 * Initiates a download of the content of the skylink within the browser.
 *
 * @param this - SkynetClient
 * @param skylinkUrl - 46-character skylink, or a valid skylink URL. Can be followed by a path. Note that the skylink will not be encoded, so if your path might contain special characters, consider using `customOptions.path`.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @param [customOptions.endpointDownload="/"] - The relative URL path of the portal endpoint to contact.
 * @returns - The full URL that was used.
 * @throws - Will throw if the skylinkUrl does not contain a skylink or if the path option is not a string.
 */
export async function downloadFile(
  this: SkynetClient,
  skylinkUrl: string,
  customOptions?: CustomDownloadOptions
): Promise<string> {
  // Validation is done in `getSkylinkUrl`.

  const opts = { ...DEFAULT_DOWNLOAD_OPTIONS, ...this.customOptions, ...customOptions, download: true };

  const url = await this.getSkylinkUrl(skylinkUrl, opts);

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
 * @param [customOptions.endpointDownloadHns="/hns"] - The relative URL path of the portal endpoint to contact.
 * @returns - The full URL that was used.
 * @throws - Will throw if the input domain is not a string.
 */
export async function downloadFileHns(
  this: SkynetClient,
  domain: string,
  customOptions?: CustomDownloadOptions
): Promise<string> {
  // Validation is done in `getHnsUrl`.

  const opts = { ...DEFAULT_DOWNLOAD_HNS_OPTIONS, ...this.customOptions, ...customOptions, download: true };

  const url = await this.getHnsUrl(domain, opts);

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
 * @param [customOptions.endpointDownload="/"] - The relative URL path of the portal endpoint to contact.
 * @returns - The full URL for the skylink.
 * @throws - Will throw if the skylinkUrl does not contain a skylink or if the path option is not a string.
 */
export async function getSkylinkUrl(
  this: SkynetClient,
  skylinkUrl: string,
  customOptions?: CustomDownloadOptions
): Promise<string> {
  // Validation is done in `getSkylinkUrlForPortal`.

  const opts = { ...DEFAULT_DOWNLOAD_OPTIONS, ...this.customOptions, ...customOptions };

  const portalUrl = await this.portalUrl();

  return getSkylinkUrlForPortal(portalUrl, skylinkUrl, opts);
}

/**
 * Gets the skylink URL without an initialized client.
 *
 * @param portalUrl - The portal URL.
 * @param skylinkUrl - Skylink string. See `downloadFile`.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @param [customOptions.endpointDownload="/"] - The relative URL path of the portal endpoint.
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
  validateOptionalObject("customOptions", customOptions, "parameter", DEFAULT_DOWNLOAD_OPTIONS);

  const opts = { ...DEFAULT_DOWNLOAD_OPTIONS, ...customOptions };

  const query = buildQuery(opts.download);

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
    // The caller wants to use a URL with the skylink as a base32 subdomain.
    //
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
    url = makeUrl(portalUrl, opts.endpointDownload, skylink);
    url = makeUrl(url, path);
  }

  return addUrlQuery(url, query);
}

/**
 * Constructs the full URL for the given HNS domain.
 *
 * @param this - SkynetClient
 * @param domain - Handshake domain.
 * @param [customOptions={}] - Additional settings that can optionally be set.
 * @param [customOptions.endpointDownloadHns="/hns"] - The relative URL path of the portal endpoint to contact.
 * @returns - The full URL for the HNS domain.
 * @throws - Will throw if the input domain is not a string.
 */
export async function getHnsUrl(
  this: SkynetClient,
  domain: string,
  customOptions?: CustomHnsDownloadOptions
): Promise<string> {
  validateString("domain", domain, "parameter");
  validateOptionalObject("customOptions", customOptions, "parameter", DEFAULT_DOWNLOAD_HNS_OPTIONS);

  const opts = { ...DEFAULT_DOWNLOAD_HNS_OPTIONS, ...this.customOptions, ...customOptions };

  const query = buildQuery(opts.download);

  domain = trimUriPrefix(domain, URI_HANDSHAKE_PREFIX);
  const portalUrl = await this.portalUrl();
  const url = opts.subdomain
    ? addSubdomain(addSubdomain(portalUrl, opts.hnsSubdomain), domain)
    : makeUrl(portalUrl, opts.endpointDownloadHns, domain);

  return addUrlQuery(url, query);
}

/**
 * Constructs the full URL for the resolver for the given HNS domain.
 *
 * @param this - SkynetClient
 * @param domain - Handshake domain.
 * @param [customOptions={}] - Additional settings that can optionally be set.
 * @param [customOptions.endpointResolveHns="/hnsres"] - The relative URL path of the portal endpoint to contact.
 * @returns - The full URL for the resolver for the HNS domain.
 * @throws - Will throw if the input domain is not a string.
 */
export async function getHnsresUrl(
  this: SkynetClient,
  domain: string,
  customOptions?: CustomHnsResolveOptions
): Promise<string> {
  validateString("domain", domain, "parameter");
  validateOptionalObject("customOptions", customOptions, "parameter", DEFAULT_RESOLVE_HNS_OPTIONS);

  const opts = { ...DEFAULT_RESOLVE_HNS_OPTIONS, ...this.customOptions, ...customOptions };

  domain = trimUriPrefix(domain, URI_HANDSHAKE_PREFIX);
  const portalUrl = await this.portalUrl();

  return makeUrl(portalUrl, opts.endpointResolveHns, domain);
}

/**
 * Gets only the metadata for the given skylink without the contents.
 *
 * @param this - SkynetClient
 * @param skylinkUrl - Skylink string. See `downloadFile`.
 * @param [customOptions] - Additional settings that can optionally be set. See `downloadFile` for the full list.
 * @param [customOptions.endpointGetMetadata="/"] - The relative URL path of the portal endpoint to contact.
 * @returns - The metadata in JSON format. Empty if no metadata was found.
 * @throws - Will throw if the skylinkUrl does not contain a skylink or if the path option is not a string.
 */
export async function getMetadata(
  this: SkynetClient,
  skylinkUrl: string,
  customOptions?: CustomGetMetadataOptions
): Promise<GetMetadataResponse> {
  validateOptionalObject("customOptions", customOptions, "parameter", DEFAULT_GET_METADATA_OPTIONS);
  // Rest of validation is done in `getSkylinkUrl`.

  const opts = { ...DEFAULT_GET_METADATA_OPTIONS, ...this.customOptions, ...customOptions };

  // Don't include the path for now since the endpoint doesn't support it.
  const path = parseSkylink(skylinkUrl, { onlyPath: true });
  if (path) {
    throw new Error("Skylink string should not contain a path");
  }
  const getSkylinkUrlOpts = { endpointDownload: opts.endpointGetMetadata };
  const url = await this.getSkylinkUrl(skylinkUrl, getSkylinkUrlOpts);

  const response = await this.executeRequest({
    ...opts,
    endpointPath: opts.endpointGetMetadata,
    method: "GET",
    url,
  });

  // TODO: Pass subdomain option.
  const inputSkylink = parseSkylink(skylinkUrl);
  validateGetMetadataResponse(response, inputSkylink as string);

  const metadata = response.data;

  const portalUrl = response.headers["skynet-portal-api"];
  const skylink = formatSkylink(response.headers["skynet-skylink"]);

  return { metadata, portalUrl, skylink };
}

/**
 * Gets the contents of the file at the given skylink.
 *
 * @param this - SkynetClient
 * @param skylinkUrl - Skylink string. See `downloadFile`.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @param [customOptions.endpointDownload="/"] - The relative URL path of the portal endpoint to contact.
 * @returns - An object containing the data of the file, the content-type, portal URL, and the file's skylink.
 * @throws - Will throw if the skylinkUrl does not contain a skylink or if the path option is not a string.
 */
export async function getFileContent<T = unknown>(
  this: SkynetClient,
  skylinkUrl: string,
  customOptions?: CustomDownloadOptions
): Promise<GetFileContentResponse<T>> {
  // Validation is done in `getFileContentRequest`.

  const response = await this.getFileContentRequest(skylinkUrl, customOptions);
  const inputSkylink = parseSkylink(skylinkUrl);

  // `inputSkylink` cannot be null. `getSkylinkUrl` would have thrown on an
  // invalid skylink.
  validateGetFileContentResponse(response, inputSkylink as string);

  return await extractGetFileContentResponse<T>(response);
}

/**
 * Makes the request to get the contents of the file at the given skylink.
 *
 * @param this - SkynetClient
 * @param skylinkUrl - Skylink string. See `downloadFile`.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @param [customOptions.endpointDownload="/"] - The relative URL path of the portal endpoint to contact.
 * @returns - The get file content response.
 * @throws - Will throw if the skylinkUrl does not contain a skylink or if the path option is not a string.
 */
export async function getFileContentRequest(
  this: SkynetClient,
  skylinkUrl: string,
  customOptions?: CustomDownloadOptions
): Promise<AxiosResponse> {
  // Validation is done in `getSkylinkUrl`.

  const opts = { ...DEFAULT_DOWNLOAD_OPTIONS, ...this.customOptions, ...customOptions };

  const url = await this.getSkylinkUrl(skylinkUrl, opts);

  const headers = buildGetFileContentHeaders(opts.range);

  // GET request the data at the skylink.
  return await this.executeRequest({
    ...opts,
    endpointPath: opts.endpointDownload,
    method: "get",
    url,
    headers,
  });
}

/**
 * Gets the contents of the file at the given Handshake domain.
 *
 * @param this - SkynetClient
 * @param domain - Handshake domain.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @param [customOptions.endpointDownloadHns="/hns"] - The relative URL path of the portal endpoint to contact.
 * @returns - An object containing the data of the file, the content-type, portal URL, and the file's skylink.
 * @throws - Will throw if the domain does not contain a skylink.
 */
export async function getFileContentHns<T = unknown>(
  this: SkynetClient,
  domain: string,
  customOptions?: CustomHnsDownloadOptions
): Promise<GetFileContentResponse<T>> {
  // Validation is done in `getHnsUrl`.

  const opts = { ...DEFAULT_DOWNLOAD_HNS_OPTIONS, ...this.customOptions, ...customOptions };

  const url = await this.getHnsUrl(domain, opts);

  const headers = buildGetFileContentHeaders(opts.range);

  // GET request the data at the HNS domain and resolve the skylink in parallel.
  const [response, { skylink: inputSkylink }] = await Promise.all([
    this.executeRequest({
      ...opts,
      endpointPath: opts.endpointDownload,
      method: "get",
      url,
      headers,
    }),
    this.resolveHns(domain),
  ]);

  validateGetFileContentResponse(response, inputSkylink);

  return await extractGetFileContentResponse<T>(response);
}

/**
 * Opens the content of the skylink within the browser.
 *
 * @param this - SkynetClient
 * @param skylinkUrl - Skylink string. See `downloadFile`.
 * @param [customOptions] - Additional settings that can optionally be set. See `downloadFile` for the full list.
 * @param [customOptions.endpointDownload="/"] - The relative URL path of the portal endpoint to contact.
 * @returns - The full URL that was used.
 * @throws - Will throw if the skylinkUrl does not contain a skylink or if the path option is not a string.
 */
export async function openFile(
  this: SkynetClient,
  skylinkUrl: string,
  customOptions?: CustomDownloadOptions
): Promise<string> {
  // Validation is done in `getSkylinkUrl`.

  const opts = { ...DEFAULT_DOWNLOAD_OPTIONS, ...this.customOptions, ...customOptions };

  const url = await this.getSkylinkUrl(skylinkUrl, opts);

  window.open(url, "_blank");

  return url;
}

/**
 * Opens the content of the skylink from the given Handshake domain within the browser.
 *
 * @param this - SkynetClient
 * @param domain - Handshake domain.
 * @param [customOptions] - Additional settings that can optionally be set. See `downloadFileHns` for the full list.
 * @param [customOptions.endpointDownloadHns="/hns"] - The relative URL path of the portal endpoint to contact.
 * @returns - The full URL that was used.
 * @throws - Will throw if the input domain is not a string.
 */
export async function openFileHns(
  this: SkynetClient,
  domain: string,
  customOptions?: CustomHnsDownloadOptions
): Promise<string> {
  // Validation is done in `getHnsUrl`.

  const opts = { ...DEFAULT_DOWNLOAD_HNS_OPTIONS, ...this.customOptions, ...customOptions };

  const url = await this.getHnsUrl(domain, opts);

  // Open the url in a new tab.
  window.open(url, "_blank");

  return url;
}

/**
 * Resolves the given HNS domain to its skylink and returns it and the raw data.
 *
 * @param this - SkynetClient
 * @param domain - Handshake resolver domain.
 * @param [customOptions={}] - Additional settings that can optionally be set.
 * @param [customOptions.endpointResolveHns="/hnsres"] - The relative URL path of the portal endpoint to contact.
 * @returns - The raw data and corresponding skylink.
 * @throws - Will throw if the input domain is not a string.
 */
export async function resolveHns(
  this: SkynetClient,
  domain: string,
  customOptions?: CustomHnsResolveOptions
): Promise<ResolveHnsResponse> {
  // Validation is done in `getHnsresUrl`.

  const opts = { ...DEFAULT_RESOLVE_HNS_OPTIONS, ...this.customOptions, ...customOptions };

  const url = await this.getHnsresUrl(domain, opts);

  // Get the txt record from the hnsres domain on the portal.
  const response = await this.executeRequest({
    ...opts,
    endpointPath: opts.endpointResolveHns,
    method: "get",
    url,
  });

  validateResolveHnsResponse(response);

  if (response.data.skylink) {
    return { data: response.data, skylink: response.data.skylink };
  } else {
    // We got a registry entry instead of a skylink, so get the entry link.
    const entryLink = getEntryLink(response.data.registry.publickey, response.data.registry.datakey, {
      hashedDataKeyHex: true,
    });
    return { data: response.data, skylink: entryLink };
  }
}

// =======
// Helpers
// =======

/**
 * Builds the headers for getFileContent.
 *
 * @param range - The optional range header.
 * @returns - The headers.
 */
function buildGetFileContentHeaders(range?: string): Headers {
  const headers: Headers = {};
  if (range) {
    headers["Range"] = range;
  }
  return headers;
}

/**
 * Helper function that builds the URL query.
 *
 * @param download - Whether to set attachment=true.
 * @returns - The URL query.
 */
function buildQuery(download: boolean): Record<string, unknown> {
  const query: Record<string, unknown> = {};
  if (download) {
    // Set the "attachment" parameter.
    query.attachment = true;
  }
  return query;
}

/**
 * Extracts the response from getFileContent.
 *
 * @param response - The Axios response.
 * @returns - The extracted get file content response fields.
 */
async function extractGetFileContentResponse<T = unknown>(response: AxiosResponse): Promise<GetFileContentResponse<T>> {
  const contentType = response.headers["content-type"];
  const portalUrl = response.headers["skynet-portal-api"];
  const skylink = formatSkylink(response.headers["skynet-skylink"]);

  return { data: response.data, contentType, portalUrl, skylink };
}

/**
 * Validates the response from getFileContent.
 *
 * @param response - The Axios response.
 * @param inputSkylink - The input skylink, required to validate the proof.
 * @throws - Will throw if the response does not contain the expected fields.
 */
function validateGetFileContentResponse(response: AxiosResponse, inputSkylink: string): void {
  try {
    // Allow data === "" to support 0-byte files.
    if (!response.data && response.data !== "") {
      throw new Error("'response.data' field missing");
    }
    if (!response.headers) {
      throw new Error("'response.headers' field missing");
    }

    const contentType = response.headers["content-type"];
    if (!contentType) {
      throw new Error("'content-type' header missing");
    }
    validateString(`response.headers["content-type"]`, contentType, "getFileContent response header");

    const portalUrl = response.headers["skynet-portal-api"];
    if (!portalUrl) {
      throw new Error("'skynet-portal-api' header missing");
    }
    validateString(`response.headers["skynet-portal-api"]`, portalUrl, "getFileContent response header");

    const skylink = response.headers["skynet-skylink"];
    if (!skylink) {
      throw new Error("'skynet-skylink' header missing");
    }
    validateSkylinkString(`response.headers["skynet-skylink"]`, skylink, "getFileContent response header");

    const proof = response.headers["skynet-proof"];
    validateRegistryProofResponse(inputSkylink, skylink, proof);
  } catch (err) {
    throw new Error(
      `File content response invalid despite a successful request. Please try again and report this issue to the devs if it persists. ${err}`
    );
  }
}

/**
 * Validates the response from getMetadata.
 *
 * @param response - The Axios response.
 * @param inputSkylink - The input skylink, required to validate the proof.
 * @throws - Will throw if the response does not contain the expected fields.
 */
function validateGetMetadataResponse(response: AxiosResponse, inputSkylink: string): void {
  try {
    if (!response.data) {
      throw new Error("'response.data' field missing");
    }
    if (!response.headers) {
      throw new Error("'response.headers' field missing");
    }

    const portalUrl = response.headers["skynet-portal-api"];
    if (!portalUrl) {
      throw new Error("'skynet-portal-api' header missing");
    }
    validateString(`response.headers["skynet-portal-api"]`, portalUrl, "getMetadata response header");

    const skylink = response.headers["skynet-skylink"];
    if (!skylink) {
      throw new Error("'skynet-skylink' header missing");
    }
    validateSkylinkString(`response.headers["skynet-skylink"]`, skylink, "getMetadata response header");

    validateRegistryProofResponse(inputSkylink, skylink, response.headers["skynet-proof"]);
  } catch (err) {
    throw new Error(
      `Metadata response invalid despite a successful request. Please try again and report this issue to the devs if it persists. ${err}`
    );
  }
}

/**
 * Validates the response from resolveHns.
 *
 * @param response - The Axios response.
 * @throws - Will throw if the response contains an unexpected format.
 */
function validateResolveHnsResponse(response: AxiosResponse): void {
  try {
    if (!response.data) {
      throw new Error("'response.data' field missing");
    }

    if (response.data.skylink) {
      // Skylink response.
      validateSkylinkString("response.data.skylink", response.data.skylink, "resolveHns response field");
    } else if (response.data.registry) {
      // Registry entry response.
      validateObject("response.data.registry", response.data.registry, "resolveHns response field");
      validateString("response.data.registry.publickey", response.data.registry.publickey, "resolveHns response field");
      validateString("response.data.registry.datakey", response.data.registry.datakey, "resolveHns response field");
    } else {
      // Invalid response.
      throwValidationError(
        "response.data",
        response.data,
        "response data object",
        "object containing skylink or registry field"
      );
    }
  } catch (err) {
    throw new Error(
      `Did not get a complete resolve HNS response despite a successful request. Please try again and report this issue to the devs if it persists. ${err}`
    );
  }
}

/**
 * Validates the registry proof response.
 *
 * @param inputSkylink - The input skylink, required to validate the proof.
 * @param dataLink - The returned data link.
 * @param proof - The returned proof.
 * @throws - Will throw if the registry proof header is not present, empty when it shouldn't be, or fails to verify.
 */
function validateRegistryProofResponse(inputSkylink: string, dataLink: string, proof?: string): void {
  let proofArray = [];
  try {
    // skyd omits the header if the array is empty.
    if (proof) {
      proofArray = JSON.parse(proof);
      if (!proofArray) {
        throw new Error("Could not parse 'skynet-proof' header as JSON");
      }
    }
  } catch (err) {
    throw new Error(`Could not parse 'skynet-proof' header as JSON: ${err}`);
  }

  if (isSkylinkV1(inputSkylink)) {
    if (inputSkylink !== dataLink) {
      throw new Error("Expected returned skylink to be the same as input data link");
    }
    // If input skylink is not an entry link, no proof should be present.
    if (proof) {
      throw new Error("Expected 'skynet-proof' header to be empty for data link");
    }
    // Nothing else to do for data links, there is no proof to validate.
    return;
  }

  // Validation for input entry link.
  if (inputSkylink === dataLink) {
    // Input skylink is entry link and returned skylink is the same.
    throw new Error("Expected returned skylink to be different from input entry link");
  }

  validateRegistryProof(proofArray, { resolverSkylink: inputSkylink, skylink: dataLink });
}
