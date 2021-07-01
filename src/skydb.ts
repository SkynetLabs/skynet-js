import { sign } from "tweetnacl";

import { SkynetClient } from "./client";
import { defaultDownloadOptions, CustomDownloadOptions } from "./download";
import {
  defaultGetEntryOptions,
  defaultSetEntryOptions,
  CustomGetEntryOptions,
  RegistryEntry,
  SignedRegistryEntry,
  CustomSetEntryOptions,
} from "./registry";
import { BASE64_ENCODED_SKYLINK_SIZE, decodeSkylink, EMPTY_SKYLINK, RAW_SKYLINK_SIZE } from "./skylink/sia";
import { MAX_REVISION } from "./utils/number";
import { uriSkynetPrefix } from "./utils/url";
import {
  hexToUint8Array,
  trimUriPrefix,
  toHexString,
  stringToUint8ArrayUtf8,
  uint8ArrayToStringUtf8,
} from "./utils/string";
import { formatSkylink } from "./skylink/format";
import { defaultUploadOptions, CustomUploadOptions, UploadRequestResponse } from "./upload";
import { decodeSkylinkBase64, encodeSkylinkBase64 } from "./utils/encoding";
import { defaultBaseOptions, extractOptions } from "./utils/options";
import {
  throwValidationError,
  validateHexString,
  validateObject,
  validateOptionalObject,
  validateSkylinkString,
  validateString,
  validateUint8ArrayLen,
} from "./utils/validation";
import { areEqualUint8Arrays } from "./utils/array";
import { ResponseType } from "axios";

export type JsonData = Record<string, unknown>;

export type JsonFullData = {
  _data: JsonData;
  _v: number;
};

const JSON_RESPONSE_VERSION = 2;

/**
 * Custom get JSON options.
 *
 * @property [cachedDataLink] - The last known data link. If it hasn't changed, do not download the file contents again.
 */
export type CustomGetJSONOptions = CustomGetEntryOptions &
  CustomDownloadOptions & {
    cachedDataLink?: string;
  };

export const defaultGetJSONOptions = {
  ...defaultBaseOptions,
  ...defaultGetEntryOptions,
  ...defaultDownloadOptions,
  cachedDataLink: undefined,
};

/**
 * Custom set JSON options.
 */
export type CustomSetJSONOptions = CustomGetJSONOptions & CustomSetEntryOptions & CustomUploadOptions;

export const defaultSetJSONOptions = {
  ...defaultBaseOptions,
  ...defaultGetJSONOptions,
  ...defaultSetEntryOptions,
  ...defaultUploadOptions,
};

export type JSONResponse = {
  data: JsonData | null;
  dataLink: string | null;
};

export type RawBytesResponse = {
  data: Uint8Array | null;
  dataLink: string | null;
};

// ====
// JSON
// ====

/**
 * Gets the JSON object corresponding to the publicKey and dataKey.
 *
 * @param this - SkynetClient
 * @param publicKey - The user public key.
 * @param dataKey - The key of the data to fetch for the given user.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - The returned JSON and corresponding data link.
 * @throws - Will throw if the returned signature does not match the returned entry, or if the skylink in the entry is invalid.
 */
export async function getJSON(
  this: SkynetClient,
  publicKey: string,
  dataKey: string,
  customOptions?: CustomGetJSONOptions
): Promise<JSONResponse> {
  validateOptionalObject("customOptions", customOptions, "parameter", defaultGetJSONOptions);
  // Rest of validation is done in `getEntry`.

  const opts = {
    ...defaultGetJSONOptions,
    ...this.customOptions,
    ...customOptions,
  };

  // Lookup the registry entry.
  const entry = await getSkyDBRegistryEntry(this, publicKey, dataKey, opts);
  if (entry === null) {
    return { data: null, dataLink: null };
  }

  // Determine the data link.
  // TODO: Can this still be an entry link which hasn't yet resolved to a data link?
  const { rawDataLink, dataLink } = parseDataLink(entry.data, true);

  // If a cached data link is provided and the data link hasn't changed, return.
  if (checkCachedDataLink(rawDataLink, opts.cachedDataLink)) {
    return { data: null, dataLink };
  }

  // Download the data in the returned data link.
  const downloadOpts = extractOptions(opts, defaultDownloadOptions);
  const { data } = await this.getFileContent<JsonData>(dataLink, downloadOpts);

  if (typeof data !== "object" || data === null) {
    throw new Error(`File data for the entry at data key '${dataKey}' is not JSON.`);
  }

  if (!(data["_data"] && data["_v"])) {
    // Legacy data prior to skynet-js v4, return as-is.
    return { data, dataLink };
  }

  const actualData = data["_data"];
  if (typeof actualData !== "object" || data === null) {
    throw new Error(`File data '_data' for the entry at data key '${dataKey}' is not JSON.`);
  }
  return { data: actualData as JsonData, dataLink };
}

/**
 * Sets a JSON object at the registry entry corresponding to the publicKey and dataKey.
 *
 * @param this - SkynetClient
 * @param privateKey - The user private key.
 * @param dataKey - The key of the data to fetch for the given user.
 * @param json - The JSON data to set.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - The returned JSON and corresponding data link.
 * @throws - Will throw if the input keys are not valid strings.
 */
export async function setJSON(
  this: SkynetClient,
  privateKey: string,
  dataKey: string,
  json: JsonData,
  customOptions?: CustomSetJSONOptions
): Promise<JSONResponse> {
  validateHexString("privateKey", privateKey, "parameter");
  validateString("dataKey", dataKey, "parameter");
  validateObject("json", json, "parameter");
  validateOptionalObject("customOptions", customOptions, "parameter", defaultSetJSONOptions);

  const opts = {
    ...defaultSetJSONOptions,
    ...this.customOptions,
    ...customOptions,
  };

  const { publicKey: publicKeyArray } = sign.keyPair.fromSecretKey(hexToUint8Array(privateKey));

  const [entry, dataLink] = await getOrCreateRegistryEntry(this, toHexString(publicKeyArray), dataKey, json, opts);

  // Update the registry.
  const setEntryOpts = extractOptions(opts, defaultSetEntryOptions);
  await this.registry.setEntry(privateKey, entry, setEntryOpts);

  return { data: json, dataLink: formatSkylink(dataLink) };
}

/**
 * Deletes a JSON object at the registry entry corresponding to the publicKey and dataKey.
 *
 * @param this - SkynetClient
 * @param privateKey - The user private key.
 * @param dataKey - The key of the data to fetch for the given user.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @throws - Will throw if the input keys are not valid strings.
 */
export async function deleteJSON(
  this: SkynetClient,
  privateKey: string,
  dataKey: string,
  customOptions?: CustomSetJSONOptions
): Promise<void> {
  validateHexString("privateKey", privateKey, "parameter");
  validateString("dataKey", dataKey, "parameter");
  validateOptionalObject("customOptions", customOptions, "parameter", defaultSetJSONOptions);

  const opts = {
    ...defaultSetJSONOptions,
    ...this.customOptions,
    ...customOptions,
  };

  const { publicKey: publicKeyArray } = sign.keyPair.fromSecretKey(hexToUint8Array(privateKey));

  const getEntryOpts = extractOptions(opts, defaultGetEntryOptions);
  const entry = await getNextRegistryEntry(
    this,
    toHexString(publicKeyArray),
    dataKey,
    new Uint8Array(RAW_SKYLINK_SIZE),
    getEntryOpts
  );

  // Update the registry.
  const setEntryOpts = extractOptions(opts, defaultSetEntryOptions);
  await this.registry.setEntry(privateKey, entry, setEntryOpts);
}

/**
 * Sets the datalink for the entry at the given private key and data key.
 *
 * @param this - SkynetClient
 * @param privateKey - The user private key.
 * @param dataKey - The key of the data to fetch for the given user.
 * @param dataLink - The data link to set at the entry.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @throws - Will throw if the input keys are not valid strings
 */
export async function setDataLink(
  this: SkynetClient,
  privateKey: string,
  dataKey: string,
  dataLink: string,
  customOptions?: CustomSetJSONOptions
): Promise<void> {
  validateHexString("privateKey", privateKey, "parameter");
  validateString("dataKey", dataKey, "parameter");
  validateString("dataLink", dataLink, "parameter");
  validateOptionalObject("customOptions", customOptions, "parameter", defaultSetJSONOptions);

  const opts = {
    ...defaultSetJSONOptions,
    ...this.customOptions,
    ...customOptions,
  };

  const { publicKey: publicKeyArray } = sign.keyPair.fromSecretKey(hexToUint8Array(privateKey));

  const getEntryOpts = extractOptions(opts, defaultGetEntryOptions);
  const entry = await getNextRegistryEntry(
    this,
    toHexString(publicKeyArray),
    dataKey,
    decodeSkylink(dataLink),
    getEntryOpts
  );

  // Update the registry.
  const setEntryOpts = extractOptions(opts, defaultSetEntryOptions);
  await this.registry.setEntry(privateKey, entry, setEntryOpts);
}

// =========
// Raw Bytes
// =========

/**
 * Gets the raw bytes corresponding to the publicKey and dataKey. The caller is responsible for setting any metadata in the bytes.
 *
 * @param this - SkynetClient
 * @param publicKey - The user public key.
 * @param dataKey - The key of the data to fetch for the given user.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - The returned bytes.
 * @throws - Will throw if the returned signature does not match the returned entry, or if the skylink in the entry is invalid.
 */
// TODO: Should we expose this in the API?
export async function getRawBytes(
  this: SkynetClient,
  publicKey: string,
  dataKey: string,
  // TODO: Take a new options type?
  customOptions?: CustomGetJSONOptions
): Promise<RawBytesResponse> {
  validateOptionalObject("customOptions", customOptions, "parameter", defaultGetJSONOptions);
  // Rest of validation is done in `getEntry`.

  const opts = {
    ...defaultGetJSONOptions,
    ...this.customOptions,
    ...customOptions,
  };

  // Lookup the registry entry.
  const entry = await getSkyDBRegistryEntry(this, publicKey, dataKey, opts);
  if (entry === null) {
    return { data: null, dataLink: null };
  }

  // Determine the data link.
  // TODO: Can this still be an entry link which hasn't yet resolved to a data link?
  const { rawDataLink, dataLink } = parseDataLink(entry.data, false);

  // If a cached data link is provided and the data link hasn't changed, return.
  if (checkCachedDataLink(rawDataLink, opts.cachedDataLink)) {
    return { data: null, dataLink };
  }

  // Download the data in the returned data link.
  const downloadOpts = { ...extractOptions(opts, defaultDownloadOptions), responseType: "arraybuffer" as ResponseType };
  const { data: buffer } = await this.getFileContent<ArrayBuffer>(dataLink, downloadOpts);

  return { data: new Uint8Array(buffer), dataLink };
}

/* istanbul ignore next */
/**
 * Gets the registry entry for the given raw bytes or creates the entry if it doesn't exist.
 *
 * @param client - The Skynet client.
 * @param publicKey - The user public key.
 * @param dataKey - The dat akey.
 * @param data - The raw byte data to set.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - The registry entry and corresponding data link.
 * @throws - Will throw if the revision is already the maximum value.
 */
// TODO: Rename & refactor after the SkyDB caching refactor.
export async function getOrCreateRawBytesRegistryEntry(
  client: SkynetClient,
  publicKey: string,
  dataKey: string,
  data: Uint8Array,
  customOptions?: CustomSetJSONOptions
): Promise<RegistryEntry> {
  // Not publicly available, don't validate input.

  const opts = {
    ...defaultSetJSONOptions,
    ...client.customOptions,
    ...customOptions,
  };

  // Create the data to upload to acquire its skylink.
  let dataKeyHex = dataKey;
  if (!opts.hashedDataKeyHex) {
    dataKeyHex = toHexString(stringToUint8ArrayUtf8(dataKey));
  }
  const file = new File([data], `dk:${dataKeyHex}`, { type: "application/octet-stream" });

  // Start file upload, do not block.
  const uploadOpts = extractOptions(opts, defaultUploadOptions);
  const skyfilePromise: Promise<UploadRequestResponse> = client.uploadFile(file, uploadOpts);

  // Fetch the current value to find out the revision.
  //
  // Start getEntry, do not block.
  const getEntryOpts = extractOptions(opts, defaultGetEntryOptions);
  const entryPromise: Promise<SignedRegistryEntry> = client.registry.getEntry(publicKey, dataKey, getEntryOpts);

  // Block until both getEntry and uploadFile are finished.
  const [signedEntry, skyfile] = await Promise.all<SignedRegistryEntry, UploadRequestResponse>([
    entryPromise,
    skyfilePromise,
  ]);

  const revision = getNextRevisionFromEntry(signedEntry.entry);

  // Build the registry entry.
  const dataLink = trimUriPrefix(skyfile.skylink, uriSkynetPrefix);
  const rawDataLink = decodeSkylinkBase64(dataLink);
  validateUint8ArrayLen("rawDataLink", rawDataLink, "skylink byte array", RAW_SKYLINK_SIZE);
  const entry: RegistryEntry = {
    dataKey,
    data: rawDataLink,
    revision,
  };
  return entry;
}

// =======
// Helpers
// =======

/**
 * Gets the next entry for the given public key and data key, setting the data to be the given data and the revision number accordingly.
 *
 * @param client - The Skynet client.
 * @param publicKey - The user public key.
 * @param dataKey - The dat akey.
 * @param data - The data to set.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - The registry entry and corresponding data link.
 * @throws - Will throw if the revision is already the maximum value.
 */
export async function getNextRegistryEntry(
  client: SkynetClient,
  publicKey: string,
  dataKey: string,
  data: Uint8Array,
  customOptions?: CustomGetEntryOptions
): Promise<RegistryEntry> {
  // Not publicly available, don't validate input.

  const opts = {
    ...defaultGetEntryOptions,
    ...client.customOptions,
    ...customOptions,
  };

  // Get the latest entry.
  // TODO: Can remove this once we start caching the latest revision.
  const signedEntry = await client.registry.getEntry(publicKey, dataKey, opts);
  const revision = getNextRevisionFromEntry(signedEntry.entry);

  // Build the registry entry.
  const entry: RegistryEntry = {
    dataKey,
    data,
    revision,
  };

  return entry;
}

/**
 * Gets the registry entry and data link or creates the entry if it doesn't exist.
 *
 * @param client - The Skynet client.
 * @param publicKey - The user public key.
 * @param dataKey - The dat akey.
 * @param json - The JSON to set.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - The registry entry and corresponding data link.
 * @throws - Will throw if the revision is already the maximum value.
 */
export async function getOrCreateRegistryEntry(
  client: SkynetClient,
  publicKey: string,
  dataKey: string,
  json: JsonData,
  customOptions?: CustomSetJSONOptions
): Promise<[RegistryEntry, string]> {
  // Not publicly available, don't validate input.

  const opts = {
    ...defaultSetJSONOptions,
    ...client.customOptions,
    ...customOptions,
  };

  // Set the hidden _data and _v fields.
  const fullData: JsonFullData = { _data: json, _v: JSON_RESPONSE_VERSION };

  // Create the data to upload to acquire its skylink.
  let dataKeyHex = dataKey;
  if (!opts.hashedDataKeyHex) {
    dataKeyHex = toHexString(stringToUint8ArrayUtf8(dataKey));
  }
  const file = new File([JSON.stringify(fullData)], `dk:${dataKeyHex}`, { type: "application/json" });

  // Start file upload, do not block.
  const uploadOpts = extractOptions(opts, defaultUploadOptions);
  const skyfilePromise: Promise<UploadRequestResponse> = client.uploadFile(file, uploadOpts);

  // Fetch the current value to find out the revision.
  //
  // Start getEntry, do not block.
  const getEntryOpts = extractOptions(opts, defaultGetEntryOptions);
  const entryPromise: Promise<SignedRegistryEntry> = client.registry.getEntry(publicKey, dataKey, getEntryOpts);

  // Block until both getEntry and uploadFile are finished.
  const [signedEntry, skyfile] = await Promise.all<SignedRegistryEntry, UploadRequestResponse>([
    entryPromise,
    skyfilePromise,
  ]);

  const revision = getNextRevisionFromEntry(signedEntry.entry);

  // Build the registry entry.
  const dataLink = trimUriPrefix(skyfile.skylink, uriSkynetPrefix);
  const data = decodeSkylinkBase64(dataLink);
  validateUint8ArrayLen("data", data, "skylink byte array", RAW_SKYLINK_SIZE);
  const entry: RegistryEntry = {
    dataKey,
    data,
    revision,
  };
  return [entry, formatSkylink(dataLink)];
}

/**
 * Gets the next revision from a returned entry (or 0 if the entry was not found).
 *
 * @param entry - The returned registry entry.
 * @returns - The revision.
 * @throws - Will throw if the next revision would be beyond the maximum allowed value.
 */
export function getNextRevisionFromEntry(entry: RegistryEntry | null): bigint {
  let revision: bigint;
  if (entry === null) {
    revision = BigInt(0);
  } else {
    revision = entry.revision + BigInt(1);
  }

  // Throw if the revision is already the maximum value.
  if (revision > MAX_REVISION) {
    throw new Error("Current entry already has maximum allowed revision, could not update the entry");
  }

  return revision;
}

/**
 * Checks whether the raw data link matches the cached data link, if provided.
 *
 * @param rawDataLink - The raw, unformatted data link.
 * @param cachedDataLink - The cached data link, if provided.
 * @returns - Whether the cached data link is a match.
 */
export function checkCachedDataLink(rawDataLink: string, cachedDataLink?: string): boolean {
  if (cachedDataLink) {
    cachedDataLink = validateSkylinkString("cachedDataLink", cachedDataLink, "optional parameter");
    return rawDataLink === cachedDataLink;
  }
  return false;
}

/**
 * Gets the registry entry, returning null if the entry contains an empty skylink (the deletion sentinel).
 *
 * @param client - The Skynet Client
 * @param publicKey - The user public key.
 * @param dataKey - The key of the data to fetch for the given user.
 * @param opts - Additional settings.
 * @returns - The registry entry, or null if not found or deleted.
 */
async function getSkyDBRegistryEntry(
  client: SkynetClient,
  publicKey: string,
  dataKey: string,
  opts: CustomGetJSONOptions
): Promise<RegistryEntry | null> {
  const getEntryOpts = extractOptions(opts, defaultGetEntryOptions);
  const { entry } = await client.registry.getEntry(publicKey, dataKey, getEntryOpts);
  if (entry === null || areEqualUint8Arrays(entry.data, EMPTY_SKYLINK)) {
    return null;
  }
  return entry;
}

/**
 * Parses a data link out of the given registry entry data.
 *
 * @param data - The raw registry entry data.
 * @param legacy - Whether to check for possible legacy skylink data, encoded as base64.
 * @returns - The raw, unformatted data link and the formatted data link.
 * @throws - Will throw if the data is not of the expected length for a skylink.
 */
function parseDataLink(data: Uint8Array, legacy: boolean): { rawDataLink: string; dataLink: string } {
  let rawDataLink = "";
  if (legacy && data.length === BASE64_ENCODED_SKYLINK_SIZE) {
    // Legacy data, convert to string for backwards compatibility.
    rawDataLink = uint8ArrayToStringUtf8(data);
  } else if (data.length === RAW_SKYLINK_SIZE) {
    // Convert the bytes to a base64 skylink.
    rawDataLink = encodeSkylinkBase64(data);
  } else {
    throwValidationError("entry.data", data, "returned entry data", `length ${RAW_SKYLINK_SIZE} bytes`);
  }
  return { rawDataLink, dataLink: formatSkylink(rawDataLink) };
}
