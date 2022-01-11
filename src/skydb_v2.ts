import { sign } from "tweetnacl";

import { SkynetClient } from "./client";
import { DEFAULT_DOWNLOAD_OPTIONS, CustomDownloadOptions } from "./download";
import {
  DEFAULT_GET_ENTRY_OPTIONS,
  DEFAULT_SET_ENTRY_OPTIONS,
  CustomGetEntryOptions,
  RegistryEntry,
  CustomSetEntryOptions,
  validatePublicKey,
} from "./registry";
import { CachedRevisionNumber } from "./revision_cache";
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
import { DEFAULT_UPLOAD_OPTIONS, CustomUploadOptions } from "./upload";
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

type SkynetJson = {
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
 * Gets the JSON object corresponding to the publicKey and dataKey. If the data
 * was found, we update the cached revision number for the entry.
 *
 * NOTE: The cached revision number will be updated only if the data is found
 * (including deleted data). If there is a 404 or the entry contains deleted
 * data, null will be returned. If there is an error, the error is returned
 * without updating the cached revision number.
 *
 * Summary:
 *   - Data found: update cached revision
 *   - Parse error: don't update cached revision
 *   - Network error: don't update cached revision
 *   - Too low version error: don't update the cached revision
 *   - 404 (data not found): don't update the cached revision
 *   - Data deleted: update cached revision
 *
 * @param this - SkynetClient
 * @param publicKey - The user public key.
 * @param dataKey - The key of the data to fetch for the given user.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - The returned JSON and corresponding data link.
 * @throws - Will throw if the returned signature does not match the returned entry, or if the skylink in the entry is invalid.
 */
export async function getJSONV2(
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

  // Immediately fail if the mutex is not available.
  return await this.db.revisionNumberCache.withCachedEntryLock(publicKey, dataKey, async (cachedRevisionEntry) => {
    // Lookup the registry entry.
    const getEntryOpts = extractOptions(opts, DEFAULT_GET_ENTRY_OPTIONS);
    const entry: RegistryEntry | null = await getSkyDBRegistryEntryAndUpdateCache(
      this,
      publicKey,
      dataKey,
      cachedRevisionEntry,
      getEntryOpts
    );
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
    const { data }: { data: JsonData | SkynetJson } = await this.getFileContent<JsonData>(dataLink, downloadOpts);

    // Validate that the returned data is JSON.
    if (typeof data !== "object" || data === null) {
      throw new Error(`File data for the entry at data key '${dataKey}' is not JSON.`);
    }

    if (!(data["_data"] && data["_v"])) {
      // Legacy data prior to skynet-js v4, return as-is.
      return { data, dataLink };
    }

    // Extract the JSON from the returned SkynetJson.
    const actualData = data["_data"];
    if (typeof actualData !== "object" || data === null) {
      throw new Error(`File data '_data' for the entry at data key '${dataKey}' is not JSON.`);
    }
    return { data: actualData as JsonData, dataLink };
  });
}

/**
 * Sets a JSON object at the registry entry corresponding to the publicKey and
 * dataKey.
 *
 * This will use the entry revision number from the cache, so getJSON must
 * always be called first for existing entries.
 *
 * @param this - SkynetClient
 * @param privateKey - The user private key.
 * @param dataKey - The key of the data to fetch for the given user.
 * @param json - The JSON data to set.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - The returned JSON and corresponding data link.
 * @throws - Will throw if the input keys are not valid strings.
 */
export async function setJSONV2(
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
  const publicKey = toHexString(publicKeyArray);

  // Immediately fail if the mutex is not available.
  return await this.db.revisionNumberCache.withCachedEntryLock(publicKey, dataKey, async (cachedRevisionEntry) => {
    // Get the cached revision number before doing anything else. Increment it.
    const newRevision = incrementRevision(cachedRevisionEntry.revision);

    const [entry, dataLink] = await getOrCreateSkyDBRegistryEntry(this, dataKey, json, newRevision, opts);

    // Update the registry.
    const setEntryOpts = extractOptions(opts, DEFAULT_SET_ENTRY_OPTIONS);
    await this.registry.setEntry(privateKey, entry, setEntryOpts);

    // Update the cached revision number.
    cachedRevisionEntry.revision = newRevision;

    return { data: json, dataLink: formatSkylink(dataLink) };
  });
}

/**
 * Deletes a JSON object at the registry entry corresponding to the publicKey
 * and dataKey.
 *
 * This will use the entry revision number from the cache, so getJSON must
 * always be called first.
 *
 * @param this - SkynetClient
 * @param privateKey - The user private key.
 * @param dataKey - The key of the data to fetch for the given user.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @throws - Will throw if the input keys are not valid strings.
 */
export async function deleteJSONV2(
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
export async function setDataLinkV2(
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
 * If the data was found, we update the cached revision number for the entry.
 * See getJSON for behavior in other cases.
 *
 * @param this - SkynetClient
 * @param publicKey - The user public key.
 * @param dataKey - The data key.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - The entry data.
 */
export async function getEntryDataV2(
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

  // Immediately fail if the mutex is not available.
  return await this.db.revisionNumberCache.withCachedEntryLock(publicKey, dataKey, async (cachedRevisionEntry) => {
    const entry = await getSkyDBRegistryEntryAndUpdateCache(this, publicKey, dataKey, cachedRevisionEntry, opts);
    if (entry === null) {
      return { data: null };
    }
    return { data: entry.data };
  });
}

/**
 * Sets the raw entry data at the given private key and data key.
 *
 * This will use the entry revision number from the cache, so getEntryData must
 * always be called first for existing entries.
 *
 * @param this - SkynetClient
 * @param privateKey - The user private key.
 * @param dataKey - The data key.
 * @param data - The raw entry data to set.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - The entry data.
 * @throws - Will throw if the length of the data is > 70 bytes.
 */
export async function setEntryDataV2(
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
  const publicKey = toHexString(publicKeyArray);

  // Immediately fail if the mutex is not available.
  return await this.db.revisionNumberCache.withCachedEntryLock(publicKey, dataKey, async (cachedRevisionEntry) => {
    // Get the cached revision number.
    const newRevision = incrementRevision(cachedRevisionEntry.revision);

    const entry = { dataKey, data, revision: newRevision };

    const setEntryOpts = extractOptions(opts, DEFAULT_SET_ENTRY_OPTIONS);
    await this.registry.setEntry(privateKey, entry, setEntryOpts);

    // Update the cached revision number.
    cachedRevisionEntry.revision = newRevision;

    return { data: entry.data };
  });
}

/**
 * Deletes the entry data at the given private key and data key. Trying to
 * access the data again with e.g. getEntryData will result in null.
 *
 * This will use the entry revision number from the cache, so getEntryData must
 * always be called first.
 *
 * @param this - SkynetClient
 * @param privateKey - The user private key.
 * @param dataKey - The data key.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - An empty promise.
 */
export async function deleteEntryDataV2(
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
 * If the data was found, we update the cached revision number for the entry.
 * See getJSON for behavior in other cases.
 *
 * @param this - SkynetClient
 * @param publicKey - The user public key.
 * @param dataKey - The key of the data to fetch for the given user.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - The returned bytes.
 * @throws - Will throw if the returned signature does not match the returned entry, or if the skylink in the entry is invalid.
 */
export async function getRawBytesV2(
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

  // Immediately fail if the mutex is not available.
  return await this.db.revisionNumberCache.withCachedEntryLock(publicKey, dataKey, async (cachedRevisionEntry) => {
    // Lookup the registry entry.
    const getEntryOpts = extractOptions(opts, DEFAULT_GET_ENTRY_OPTIONS);
    const entry = await getSkyDBRegistryEntryAndUpdateCache(
      this,
      publicKey,
      dataKey,
      cachedRevisionEntry,
      getEntryOpts
    );
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
  });
}

// =======
// Helpers
// =======

/**
 * Gets the registry entry and data link or creates the entry if it doesn't
 * exist. Uses the cached revision number for the entry, or 0 if the entry has
 * not been cached.
 *
 * @param client - The Skynet client.
 * @param dataKey - The data key.
 * @param data - The JSON or raw byte data to set.
 * @param revision - The revision number to set.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - The registry entry and corresponding data link.
 * @throws - Will throw if the revision is already the maximum value.
 */
export async function getOrCreateSkyDBRegistryEntry(
  client: SkynetClient,
  dataKey: string,
  data: JsonData | Uint8Array,
  revision: bigint,
  customOptions?: CustomSetJSONOptions
): Promise<[RegistryEntry, string]> {
  // Not publicly available, don't validate input.

  const opts = {
    ...DEFAULT_SET_JSON_OPTIONS,
    ...client.customOptions,
    ...customOptions,
  };

  let fullData: string | Uint8Array;
  if (!(data instanceof Uint8Array)) {
    // Set the hidden _data and _v fields.
    const skynetJson = buildSkynetJsonObject(data);
    fullData = JSON.stringify(skynetJson);
  } else {
    /* istanbul ignore next - This case is only called by setJSONEncrypted which is not tested in this repo */
    fullData = data;
  }

  // Create the data to upload to acquire its skylink.
  let dataKeyHex = dataKey;
  if (!opts.hashedDataKeyHex) {
    dataKeyHex = toHexString(stringToUint8ArrayUtf8(dataKey));
  }
  const file = new File([fullData], `dk:${dataKeyHex}`, { type: "application/json" });

  // Do file upload.
  const uploadOpts = extractOptions(opts, DEFAULT_UPLOAD_OPTIONS);
  const skyfile = await client.uploadFile(file, uploadOpts);

  // Build the registry entry.
  const dataLink = trimUriPrefix(skyfile.skylink, URI_SKYNET_PREFIX);
  const rawDataLink = decodeSkylinkBase64(dataLink);
  validateUint8ArrayLen("rawDataLink", rawDataLink, "skylink byte array", RAW_SKYLINK_SIZE);
  const entry: RegistryEntry = {
    dataKey,
    data: rawDataLink,
    revision,
  };
  return [entry, formatSkylink(dataLink)];
}

/**
 * Increments the given revision number and checks to make sure it is not
 * greater than the maximum revision.
 *
 * @param revision - The given revision number.
 * @returns - The incremented revision number.
 * @throws - Will throw if the incremented revision number is greater than the maximum revision.
 */
export function incrementRevision(revision: bigint): bigint {
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
 * Gets the registry entry, returning null if the entry was not found or if it
 * contained a sentinel value indicating deletion.
 *
 * If the data was found, we update the cached revision number for the entry.
 * See getJSON for behavior in other cases.
 *
 * @param client - The Skynet Client
 * @param publicKey - The user public key.
 * @param dataKey - The key of the data to fetch for the given user.
 * @param cachedRevisionEntry - The cached revision entry object containing the revision number and the mutex.
 * @param opts - Additional settings.
 * @returns - The registry entry, or null if not found or deleted.
 */
async function getSkyDBRegistryEntryAndUpdateCache(
  client: SkynetClient,
  publicKey: string,
  dataKey: string,
  cachedRevisionEntry: CachedRevisionNumber,
  opts: CustomGetEntryOptions
): Promise<RegistryEntry | null> {
  // If this throws due to a parse error or network error, exit early and do not
  // update the cached revision number.
  const { entry } = await client.registry.getEntry(publicKey, dataKey, opts);

  // Don't update the cached revision number if the data was not found (404). Return null.
  if (entry === null) {
    return null;
  }

  // Calculate the new revision.
  const newRevision = entry?.revision ?? UNCACHED_REVISION_NUMBER + BigInt(1);

  // Don't update the cached revision number if the received version is too low.
  // Throw error.
  const cachedRevision = cachedRevisionEntry.revision;
  if (cachedRevision && cachedRevision > newRevision) {
    throw new Error(
      "Returned revision number too low. A higher revision number for this userID and path is already cached"
    );
  }

  // Update the cached revision.
  cachedRevisionEntry.revision = newRevision;

  // Return null if the entry contained a sentinel value indicating deletion.
  // We do this after updating the revision number cache.
  if (wasRegistryEntryDeleted(entry)) {
    return null;
  }

  return entry;
}

/**
 * Sets the hidden _data and _v fields on the given raw JSON data.
 *
 * @param data - The given JSON data.
 * @returns - The Skynet JSON data.
 */
function buildSkynetJsonObject(data: JsonData): SkynetJson {
  return { _data: data, _v: JSON_RESPONSE_VERSION };
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

/**
 * Returns whether the given registry entry indicates a past deletion.
 *
 * @param entry - The registry entry.
 * @returns - Whether the registry entry data indicated a past deletion.
 */
function wasRegistryEntryDeleted(entry: RegistryEntry): boolean {
  return areEqualUint8Arrays(entry.data, EMPTY_SKYLINK);
}
