import { sign } from "tweetnacl";

import { SkynetClient } from "./client";
import { DEFAULT_DOWNLOAD_OPTIONS, CustomDownloadOptions } from "./download";
import {
  DEFAULT_GET_ENTRY_OPTIONS,
  DEFAULT_SET_ENTRY_OPTIONS,
  CustomGetEntryOptions,
  RegistryEntry,
  SignedRegistryEntry,
  CustomSetEntryOptions,
  validatePublicKey,
} from "./registry";
import { BASE64_ENCODED_SKYLINK_SIZE, decodeSkylink, EMPTY_SKYLINK, RAW_SKYLINK_SIZE } from "./skylink/sia";
import { MAX_REVISION } from "./utils/number";
import { URI_SKYNET_PREFIX } from "./utils/url";
import {
  hexToUint8Array,
  trimUriPrefix,
  toHexString,
  stringToUint8ArrayUtf8,
  uint8ArrayToStringUtf8,
} from "./utils/string";
import { formatSkylink } from "./skylink/format";
import { DEFAULT_UPLOAD_OPTIONS, CustomUploadOptions, UploadRequestResponse } from "./upload";
import { areEqualUint8Arrays } from "./utils/array";
import { decodeSkylinkBase64, encodeSkylinkBase64 } from "./utils/encoding";
import { DEFAULT_BASE_OPTIONS, extractOptions } from "./utils/options";
import { JsonData } from "./utils/types";
import {
  throwValidationError,
  validateHexString,
  validateObject,
  validateOptionalObject,
  validateSkylinkString,
  validateString,
  validateUint8Array,
  validateUint8ArrayLen,
} from "./utils/validation";
import { ResponseType } from "axios";
import { EntryData, MAX_ENTRY_LENGTH } from "./mysky";

export type JsonFullData = {
  _data: JsonData;
  _v: number;
};

export const DELETION_ENTRY_DATA = new Uint8Array(RAW_SKYLINK_SIZE);

const JSON_RESPONSE_VERSION = 2;

const UNCACHED_REVISION_NUMBER = BigInt(-1);

/**
 * Custom get JSON options. Includes the options for get entry, to get the
 * skylink; and download, to download the file from the skylink.
 *
 * @property [cachedDataLink] - The last known data link. If it hasn't changed, do not download the file contents again.
 */
export type CustomGetJSONOptions = CustomGetEntryOptions &
  CustomDownloadOptions & {
    cachedDataLink?: string;
  };

/**
 * The default options for get JSON. Includes the default get entry and download
 * options.
 */
export const DEFAULT_GET_JSON_OPTIONS = {
  ...DEFAULT_BASE_OPTIONS,
  ...DEFAULT_GET_ENTRY_OPTIONS,
  ...DEFAULT_DOWNLOAD_OPTIONS,
  cachedDataLink: undefined,
};

/**
 * Custom set JSON options. Includes the options for upload, to get the file for
 * the skylink; get JSON, to retrieve the revision; and set entry, to set the
 * entry with the skylink and revision.
 */
export type CustomSetJSONOptions = CustomUploadOptions & CustomGetJSONOptions & CustomSetEntryOptions;

/**
 * The default options for set JSON. Includes the default upload, get JSON, and
 * set entry options.
 */
export const DEFAULT_SET_JSON_OPTIONS = {
  ...DEFAULT_BASE_OPTIONS,
  ...DEFAULT_UPLOAD_OPTIONS,
  ...DEFAULT_GET_JSON_OPTIONS,
  ...DEFAULT_SET_ENTRY_OPTIONS,
};

/**
 * Custom set entry data options. Includes the options for get and set entry.
 */
export type CustomSetEntryDataOptions = CustomGetEntryOptions &
  CustomSetEntryOptions & { allowDeletionEntryData: boolean };

/**
 * The default options for set entry data. Includes the default get entry and
 * set entry options.
 */
export const DEFAULT_SET_ENTRY_DATA_OPTIONS = {
  ...DEFAULT_BASE_OPTIONS,
  ...DEFAULT_GET_ENTRY_OPTIONS,
  ...DEFAULT_SET_ENTRY_OPTIONS,
  allowDeletionEntryData: false,
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
  validatePublicKey("publicKey", publicKey, "parameter");
  validateString("dataKey", dataKey, "parameter");
  validateOptionalObject("customOptions", customOptions, "parameter", DEFAULT_GET_JSON_OPTIONS);

  const opts = {
    ...DEFAULT_GET_JSON_OPTIONS,
    ...this.customOptions,
    ...customOptions,
  };

  // Lookup the registry entry.
  const getEntryOpts = extractOptions(opts, DEFAULT_GET_ENTRY_OPTIONS);
  const entry: RegistryEntry | null = await getSkyDBRegistryEntry(this, publicKey, dataKey, getEntryOpts);

  // Calculate the new revision and get the cached revision.
  const revision = entry?.revision ?? UNCACHED_REVISION_NUMBER;
  const newRevision = incrementRevision(revision);
  const cacheKey = getCacheKey(publicKey, dataKey);
  const cachedRevision = this.revisionNumberCache[cacheKey];

  if (cachedRevision && cachedRevision >= newRevision) {
    throw new Error("A higher revision number for this userID and path is already cached");
  }

  // Update the cached revision.
  this.revisionNumberCache[cacheKey] = newRevision;

  // Return null if the entry was not found or if it contained a sentinel value indicating deletion.
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
  const downloadOpts = extractOptions(opts, DEFAULT_DOWNLOAD_OPTIONS);
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
  validateOptionalObject("customOptions", customOptions, "parameter", DEFAULT_SET_JSON_OPTIONS);

  const opts = {
    ...DEFAULT_SET_JSON_OPTIONS,
    ...this.customOptions,
    ...customOptions,
  };

  const { publicKey: publicKeyArray } = sign.keyPair.fromSecretKey(hexToUint8Array(privateKey));

  const [entry, dataLink] = await getOrCreateRegistryEntry(this, toHexString(publicKeyArray), dataKey, json, opts);

  // Update the registry.
  const setEntryOpts = extractOptions(opts, DEFAULT_SET_ENTRY_OPTIONS);
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
  customOptions?: CustomSetEntryDataOptions
): Promise<void> {
  // Validation is done below in `db.setEntryData`.

  const opts = {
    ...DEFAULT_SET_ENTRY_DATA_OPTIONS,
    ...this.customOptions,
    ...customOptions,
  };

  await this.db.setEntryData(privateKey, dataKey, DELETION_ENTRY_DATA, { ...opts, allowDeletionEntryData: true });
}

// ==========
// Entry Data
// ==========

/**
 * Sets the datalink for the entry at the given private key and data key.
 *
 * @param this - SkynetClient
 * @param privateKey - The user private key.
 * @param dataKey - The data key.
 * @param dataLink - The data link to set at the entry.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @throws - Will throw if the input keys are not valid strings.
 */
export async function setDataLink(
  this: SkynetClient,
  privateKey: string,
  dataKey: string,
  dataLink: string,
  customOptions?: CustomSetEntryDataOptions
): Promise<void> {
  const parsedSkylink = validateSkylinkString("dataLink", dataLink, "parameter");
  // Rest of validation is done below in `db.setEntryData`.

  const data = decodeSkylink(parsedSkylink);

  await this.db.setEntryData(privateKey, dataKey, data, customOptions);
}

/**
 * Gets the raw registry entry data at the given public key and data key.
 *
 * @param this - SkynetClient
 * @param publicKey - The user public key.
 * @param dataKey - The data key.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - The entry data.
 */
export async function getEntryData(
  this: SkynetClient,
  publicKey: string,
  dataKey: string,
  customOptions?: CustomGetEntryOptions
): Promise<EntryData> {
  validatePublicKey("publicKey", publicKey, "parameter");
  validateString("dataKey", dataKey, "parameter");
  validateOptionalObject("customOptions", customOptions, "parameter", DEFAULT_GET_ENTRY_OPTIONS);

  const opts = {
    ...DEFAULT_GET_ENTRY_OPTIONS,
    ...this.customOptions,
    ...customOptions,
  };

  const entry = await getSkyDBRegistryEntry(this, publicKey, dataKey, opts);
  if (entry === null) {
    return { data: null };
  }
  return { data: entry.data };
}

/**
 * Sets the raw entry data at the given private key and data key.
 *
 * @param this - SkynetClient
 * @param privateKey - The user private key.
 * @param dataKey - The data key.
 * @param data - The raw entry data to set.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - The entry data.
 * @throws - Will throw if the length of the data is > 70 bytes.
 */
export async function setEntryData(
  this: SkynetClient,
  privateKey: string,
  dataKey: string,
  data: Uint8Array,
  customOptions?: CustomSetEntryDataOptions
): Promise<EntryData> {
  validateHexString("privateKey", privateKey, "parameter");
  validateString("dataKey", dataKey, "parameter");
  validateUint8Array("data", data, "parameter");
  validateOptionalObject("customOptions", customOptions, "parameter", DEFAULT_SET_ENTRY_DATA_OPTIONS);

  const opts = {
    ...DEFAULT_SET_ENTRY_DATA_OPTIONS,
    ...this.customOptions,
    ...customOptions,
  };

  validateEntryData(data, opts.allowDeletionEntryData);

  const { publicKey: publicKeyArray } = sign.keyPair.fromSecretKey(hexToUint8Array(privateKey));

  const getEntryOpts = extractOptions(opts, DEFAULT_GET_ENTRY_OPTIONS);
  const entry = await getNextRegistryEntry(this, toHexString(publicKeyArray), dataKey, data, getEntryOpts);

  const setEntryOpts = extractOptions(opts, DEFAULT_SET_ENTRY_OPTIONS);
  await this.registry.setEntry(privateKey, entry, setEntryOpts);

  return { data: entry.data };
}

/**
 * Deletes the entry data at the given private key and data key. Trying to
 * access the data again with e.g. getEntryData will result in null.
 *
 * @param this - SkynetClient
 * @param privateKey - The user private key.
 * @param dataKey - The data key.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - An empty promise.
 */
export async function deleteEntryData(
  this: SkynetClient,
  privateKey: string,
  dataKey: string,
  customOptions?: CustomSetEntryDataOptions
): Promise<void> {
  // Validation is done below in `db.setEntryData`.

  await this.db.setEntryData(privateKey, dataKey, DELETION_ENTRY_DATA, {
    ...customOptions,
    allowDeletionEntryData: true,
  });
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
export async function getRawBytes(
  this: SkynetClient,
  publicKey: string,
  dataKey: string,
  // TODO: Take a new options type?
  customOptions?: CustomGetJSONOptions
): Promise<RawBytesResponse> {
  validatePublicKey("publicKey", publicKey, "parameter");
  validateString("dataKey", dataKey, "parameter");
  validateOptionalObject("customOptions", customOptions, "parameter", DEFAULT_GET_JSON_OPTIONS);

  const opts = {
    ...DEFAULT_GET_JSON_OPTIONS,
    ...this.customOptions,
    ...customOptions,
  };

  // Lookup the registry entry.
  const getEntryOpts = extractOptions(opts, DEFAULT_GET_ENTRY_OPTIONS);
  const entry = await getSkyDBRegistryEntry(this, publicKey, dataKey, getEntryOpts);
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
  const downloadOpts = {
    ...extractOptions(opts, DEFAULT_DOWNLOAD_OPTIONS),
    responseType: "arraybuffer" as ResponseType,
  };
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
    ...DEFAULT_SET_JSON_OPTIONS,
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
  const uploadOpts = extractOptions(opts, DEFAULT_UPLOAD_OPTIONS);
  const skyfilePromise: Promise<UploadRequestResponse> = client.uploadFile(file, uploadOpts);

  // Fetch the current value to find out the revision.
  //
  // Start getEntry, do not block.
  const getEntryOpts = extractOptions(opts, DEFAULT_GET_ENTRY_OPTIONS);
  const entryPromise: Promise<SignedRegistryEntry> = client.registry.getEntry(publicKey, dataKey, getEntryOpts);

  // Block until both getEntry and uploadFile are finished.
  const [signedEntry, skyfile] = await Promise.all<SignedRegistryEntry, UploadRequestResponse>([
    entryPromise,
    skyfilePromise,
  ]);

  const revision = getNextRevisionFromEntry(signedEntry.entry);

  // Build the registry entry.
  const dataLink = trimUriPrefix(skyfile.skylink, URI_SKYNET_PREFIX);
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
    ...DEFAULT_GET_ENTRY_OPTIONS,
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
    ...DEFAULT_SET_JSON_OPTIONS,
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

  // Do file upload.
  const uploadOpts = extractOptions(opts, DEFAULT_UPLOAD_OPTIONS);
  const skyfile = await client.uploadFile(file, uploadOpts);

  // Get the new revision by incrementing the one in the cache, or use 0 if not cached.
  const cacheKey = getCacheKey(publicKey, dataKey);
  let revision: bigint = client.revisionNumberCache[cacheKey] ?? UNCACHED_REVISION_NUMBER;
  revision = incrementRevision(revision);

  // Build the registry entry.
  const dataLink = trimUriPrefix(skyfile.skylink, URI_SKYNET_PREFIX);
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
 * Gets the revision cache key for the given public key and data key.
 *
 * @param publicKey - The given public key.
 * @param dataKey - The given data key.
 * @returns - The revision cache key.
 */
function getCacheKey(publicKey: string, dataKey: string): string {
  return `${publicKey}/${dataKey}`;
}

/**
 * Gets the next revision from a returned entry (or 0 if the entry was not
 * found).
 *
 * @param entry - The returned registry entry.
 * @returns - The revision.
 * @throws - Will throw if the next revision would be beyond the maximum allowed value.
 */
export function getNextRevisionFromEntry(entry: RegistryEntry | null): bigint {
  if (entry === null) {
    return BigInt(0);
  }
  return incrementRevision(entry.revision);
}

/**
 * Increments the given revision number and checks to make sure it is not
 * greater than the maximum revision.
 *
 * @param revision - The given revision number.
 * @returns - The incremented revision number.
 * @throws - Will throw if the incremented revision number is greater than the maximum revision.
 */
function incrementRevision(revision: bigint): bigint {
  revision = revision + BigInt(1);

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
 * @throws - Will throw if the given cached data link is not a valid skylink.
 */
export function checkCachedDataLink(rawDataLink: string, cachedDataLink?: string): boolean {
  if (cachedDataLink) {
    cachedDataLink = validateSkylinkString("cachedDataLink", cachedDataLink, "optional parameter");
    return rawDataLink === cachedDataLink;
  }
  return false;
}

/**
 * Validates the given entry data.
 *
 * @param data - The entry data to validate.
 * @param allowDeletionEntryData - If set to false, disallows setting the entry data that marks a deletion. This is a likely developer error if it was not done through the deleteEntryData method.
 * @throws - Will throw if the data is invalid.
 */
export function validateEntryData(data: Uint8Array, allowDeletionEntryData: boolean): void {
  // Check that the length is not greater than the maximum allowed.
  if (data.length > MAX_ENTRY_LENGTH) {
    throwValidationError(
      "data",
      data,
      "parameter",
      `'Uint8Array' of length <= ${MAX_ENTRY_LENGTH}, was length ${data.length}`
    );
  }

  // Check that we are not setting the deletion sentinel as that is probably a developer mistake.
  if (!allowDeletionEntryData && areEqualUint8Arrays(data, DELETION_ENTRY_DATA)) {
    throw new Error(
      "Tried to set 'Uint8Array' entry data that is the deletion sentinel ('Uint8Array(RAW_SKYLINK_SIZE)'), please use the 'deleteEntryData' method instead`"
    );
  }
}

/**
 * Gets the registry entry, returning null if the entry was not found or if it contained a sentinel value indicating deletion.
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
  opts: CustomGetEntryOptions
): Promise<RegistryEntry | null> {
  const { entry } = await client.registry.getEntry(publicKey, dataKey, opts);

  // Return null if the entry was not found or if it contained a sentinel value indicating deletion.
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
