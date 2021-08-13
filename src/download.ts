import { AxiosResponse, ResponseType } from "axios";
import { toByteArray } from "base64-js";
import { sign } from "tweetnacl";

import { SkynetClient } from "./client";
import { hashRegistryEntry, PUBLIC_KEY_LENGTH, SIGNATURE_LENGTH } from "./crypto";
import { getEntryLink } from "./registry";
import { JsonData } from "./skydb";
import { convertSkylinkToBase32, formatSkylink } from "./skylink/format";
import { parseSkylink } from "./skylink/parse";
import { isSkylinkV1 } from "./skylink/sia";
import { encodeSkylinkBase64 } from "./utils/encoding";
import { BaseCustomOptions, defaultBaseOptions } from "./utils/options";
import { hexToUint8Array, toHexString, trimUriPrefix } from "./utils/string";
import { addSubdomain, addUrlQuery, makeUrl, uriHandshakePrefix, uriSkynetPrefix } from "./utils/url";
import {
  throwValidationError,
  validateObject,
  validateOptionalObject,
  validateSkylinkString,
  validateString,
  validateUint8ArrayLen,
} from "./utils/validation";

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
  // TODO: Add subdomain option.
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
  ...defaultBaseOptions,
  endpointDownload: "/",
  download: false,
  path: undefined,
  range: undefined,
  responseType: undefined,
  subdomain: false,
};

/**
 * @deprecated please use DEFAULT_DOWNLOAD_OPTIONS.
 */
export const defaultDownloadOptions = DEFAULT_DOWNLOAD_OPTIONS;

const defaultGetMetadataOptions = {
  ...defaultBaseOptions,
  endpointGetMetadata: "/skynet/metadata",
};
const defaultDownloadHnsOptions = {
  ...defaultDownloadOptions,
  endpointDownloadHns: "hns",
  hnsSubdomain: "hns",
  // Default to subdomain format for HNS URLs.
  subdomain: true,
};
const defaultResolveHnsOptions = {
  ...defaultBaseOptions,
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

  const opts = { ...defaultDownloadOptions, ...this.customOptions, ...customOptions, download: true };

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

  const opts = { ...defaultDownloadHnsOptions, ...this.customOptions, ...customOptions, download: true };

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

  const opts = { ...defaultDownloadOptions, ...this.customOptions, ...customOptions };

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
  validateOptionalObject("customOptions", customOptions, "parameter", defaultDownloadOptions);

  const opts = { ...defaultDownloadOptions, ...customOptions };

  const query: Record<string, unknown> = {};
  if (opts.download) {
    // Set the "attachment" parameter.
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
  validateOptionalObject("customOptions", customOptions, "parameter", defaultDownloadHnsOptions);

  const opts = { ...defaultDownloadHnsOptions, ...this.customOptions, ...customOptions };

  const query: Record<string, unknown> = {};
  if (opts.download) {
    query.attachment = true;
  }

  domain = trimUriPrefix(domain, uriHandshakePrefix);
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
  validateOptionalObject("customOptions", customOptions, "parameter", defaultResolveHnsOptions);

  const opts = { ...defaultResolveHnsOptions, ...this.customOptions, ...customOptions };

  domain = trimUriPrefix(domain, uriHandshakePrefix);
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
  validateOptionalObject("customOptions", customOptions, "parameter", defaultGetMetadataOptions);
  // Rest of validation is done in `getSkylinkUrl`.

  const opts = { ...defaultGetMetadataOptions, ...this.customOptions, ...customOptions };

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
 * @returns - An object containing the data of the file, the content-type, metadata, and the file's skylink.
 * @throws - Will throw if the skylinkUrl does not contain a skylink or if the path option is not a string.
 */
export async function getFileContent<T = unknown>(
  this: SkynetClient,
  skylinkUrl: string,
  customOptions?: CustomDownloadOptions
): Promise<GetFileContentResponse<T>> {
  // Validation is done in `getSkylinkUrl`.

  const opts = { ...defaultDownloadOptions, ...this.customOptions, ...customOptions };

  const url = await this.getSkylinkUrl(skylinkUrl, opts);

  return this.getFileContentRequest<T>(url, opts);
}

/**
 * Gets the contents of the file at the given Handshake domain.
 *
 * @param this - SkynetClient
 * @param domain - Handshake domain.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @param [customOptions.endpointDownloadHns="/hns"] - The relative URL path of the portal endpoint to contact.
 * @returns - An object containing the data of the file, the content-type, metadata, and the file's skylink.
 * @throws - Will throw if the domain does not contain a skylink.
 */
export async function getFileContentHns<T = unknown>(
  this: SkynetClient,
  domain: string,
  customOptions?: CustomHnsDownloadOptions
): Promise<GetFileContentResponse<T>> {
  // Validation is done in `getHnsUrl`.

  const opts = { ...defaultDownloadHnsOptions, ...this.customOptions, ...customOptions };

  const url = await this.getHnsUrl(domain, opts);

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
  // Not publicly available, don't validate input.

  const opts = { ...defaultDownloadOptions, ...this.customOptions, ...customOptions };

  const headers = opts.range ? { Range: opts.range } : undefined;

  // GET request the data at the skylink.
  const response = await this.executeRequest({
    ...opts,
    endpointPath: opts.endpointDownload,
    method: "get",
    url,
    headers,
  });

  const inputSkylink = parseSkylink(url);
  // The input skylink will be null for HNS URLs.
  //
  // TODO: Should we validate the registry proof when making GET requests to HNS
  // domains? It would require an additional call to resolveHns (including a
  // network request) to get the skylink for the HNS domain.
  validateGetFileContentResponse(response, inputSkylink);

  const data = response.data;

  const contentType = response.headers["content-type"];
  const portalUrl = response.headers["skynet-portal-api"];
  const skylink = formatSkylink(response.headers["skynet-skylink"]);

  return { data, contentType, portalUrl, skylink };
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

  const opts = { ...defaultDownloadOptions, ...this.customOptions, ...customOptions };

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

  const opts = { ...defaultDownloadHnsOptions, ...this.customOptions, ...customOptions };

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

  const opts = { ...defaultResolveHnsOptions, ...this.customOptions, ...customOptions };

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

/**
 * Validates the response from getFileContent.
 *
 * @param response - The Axios response.
 * @param inputSkylink - The input skylink, required to validate the proof.
 * @throws - Will throw if the response does not contain the expected fields.
 */
function validateGetFileContentResponse(response: AxiosResponse, inputSkylink: string | null): void {
  try {
    if (!response.data) {
      throw new Error("'response.data' field missing");
    }
    if (!response.headers) {
      throw new Error("'response.headers' field missing");
    }

    const contentType = response.headers["content-type"];
    if (!contentType) {
      throw new Error("'content-type' header missing");
    }
    validateString(`response.headers["content-type"]`, contentType, "getMetadata response header");

    // const portalUrl = response.headers["skynet-portal-api"];
    // if (!portalUrl) {
    //   throw new Error("'skynet-portal-api' header missing");
    // }
    // validateString(`response.headers["skynet-portal-api"]`, portalUrl, "getMetadata response header");

    const skylink = response.headers["skynet-skylink"];
    if (!skylink) {
      throw new Error("'skynet-skylink' header missing");
    }
    validateSkylinkString(`response.headers["skynet-skylink"]`, skylink, "getMetadata response header");

    // console.log(response.headers);
    const proof = response.headers["skynet-proof"];
    // const proof = JSON.stringify([{"data":"01005450d146bc5dbad49baf0998c405020b75f07552a566696b8b4bc30a3eff3663","revision":2,"datakey":"8b310799b1b4c99c313642cb8a6bb57506e98eb1b7b03a6d42b7cc0b9d416785","publickey":{"algorithm":"ed25519","key":"53DNDyWI0DL+SKc9rdPHG0Gbl9Q6cQTE/6TjDu++ujg="},"signature":"3820b2f20bc52d02eeafa32c554792d93be4af67d2df20aa8a6585b9896595e68fa51c30d10a18598688c184c46dc767b20f5e2b3cb93b7083fe5eb35f208003","type":1},{"data":"10000582ad7b07e30ab22d004582943267fdbf16d9943a59900e846950421b860101","revision":2,"datakey":"7a7697234d7ce99e7672fb8765b3697bbd22b0531e3d5b738325c7c7e4f2ad6e","publickey":{"algorithm":"ed25519","key":"/tclMcIMtXlaE+TKtP4Cbo1p38A5dCSiCDMBIsNrhko="},"signature":"cbadf0c7210670768ff66edf53c45a0af88b14511616a922e22fdc0de045c9a17d0ba7d99315a632b2c350ccc94ce67d8da0ec69bc9fd922db2113ca14882704","type":1}]);
    // const proof = JSON.stringify([{"data":"5c006f8bb26d25b412300703c275279a9d852833e383cfed4d314fe01c0c4b155d12","revision":0,"datakey":"43c8a9b01609544ab152dad397afc3b56c1518eb546750dbc6cad5944fec0292","publickey":{"algorithm":"ed25519","key":"y/l99FyfFm6JPhZL5xSkruhA06Qh9m5S9rnipQCc+rw="},"signature":"5a1437508eedb6f5352d7f744693908a91bb05c01370ce4743de9c25f761b4e87760b8172448c073a4ddd9d58d1a2bf978b3227e57e4fa8cbe830a2353be2207","type":1}]);
    // console.log(`proof: ${proof}`);
    if (inputSkylink !== null) {
      validateRegistryProof(inputSkylink, skylink, proof);
    }
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

    validateRegistryProof(inputSkylink, skylink, response.headers["skynet-proof"]);
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
 * Validates the registry proof.
 *
 * @param inputSkylink - The input skylink, required to validate the proof.
 * @param dataLink - The returned data link.
 * @param proof - The returned proof.
 * @throws - Will throw if the registry proof header is not present, empty when it shouldn't be, or fails to verify.
 */
function validateRegistryProof(inputSkylink: string, dataLink: string, proof?: string): void {
  let proofArray = [];
  if (proof) {
    // TODO: skyd currently omits the header if the array is empty, but in the future we should assert the header is always present
    proofArray = JSON.parse(proof);
    if (!proofArray) {
      throw new Error("Could not parse 'skynet-proof' header as JSON");
    }
  }

  if (isSkylinkV1(inputSkylink)) {
    if (inputSkylink !== dataLink) {
      throw new Error("Expected returned skylink to be the same as input data link");
    }
    // If input skylink is not an entry link, no proof should be present.
    if (proofArray.length > 0) {
      throw new Error("Expected 'skynet-proof' header to be empty for data link");
    }
    return;
  } else {
    if (inputSkylink === dataLink) {
      // Input skylink is entry link and returned skylink is the same.
      throw new Error("Expected returned skylink to be different from input entry link");
    }
    if (proofArray.length === 0) {
      // Input skylink is entry link but registry proof is empty.
      throw new Error("Expected 'skynet-proof' header not to be empty for entry link");
    }
  }

  // Verify the registry proof.
  let lastSkylink = inputSkylink;
  for (const entry of proofArray) {
    const publicKey = entry.publickey.key;
    const publicKeyBytes = toByteArray(publicKey);
    const publicKeyHex = toHexString(publicKeyBytes);
    const dataKey = entry.datakey;
    const data = entry.data;
    const signatureBytes = hexToUint8Array(entry.signature);

    // Verify the current entry corresponds to the previous skylink in the chain.
    let entryLink = getEntryLink(publicKeyHex, dataKey, { hashedDataKeyHex: true });
    entryLink = trimUriPrefix(entryLink, uriSkynetPrefix);
    if (entryLink !== lastSkylink) {
      throw new Error("Could not verify registry proof chain");
    }

    // Data bytes are hex-encoded raw skylink bytes.
    const rawData = hexToUint8Array(data);
    const skylink = encodeSkylinkBase64(rawData);

    // Try verifying the returned data.
    const entryToVerify = {
      dataKey,
      data: rawData,
      revision: BigInt(entry.revision),
    };
    // Verify length of signature and public key.
    validateUint8ArrayLen("signatureArray", signatureBytes, "response value", SIGNATURE_LENGTH);
    validateUint8ArrayLen("publicKeyArray", publicKeyBytes, "parameter", PUBLIC_KEY_LENGTH / 2);
    if (!sign.detached.verify(hashRegistryEntry(entryToVerify, true), signatureBytes, publicKeyBytes)) {
      // Registry proof fails to verify.
      throw new Error("Could not verify signature from retrieved, signed registry entry in registry proof");
    }

    lastSkylink = skylink;
  }

  if (lastSkylink !== dataLink) {
    throw new Error("Could not verify registry proof chain");
  }
}
