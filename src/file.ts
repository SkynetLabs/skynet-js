import { SkynetClient } from "./client";
import { EntryData } from "./mysky";
import {
  decryptJSONFile,
  deriveEncryptedFileKeyEntropy,
  deriveEncryptedFileTweak,
  EncryptedJSONResponse,
} from "./mysky/encrypted_files";
import { deriveDiscoverableFileTweak } from "./mysky/tweak";
import { CustomGetEntryOptions, DEFAULT_GET_ENTRY_OPTIONS, getEntryLink as registryGetEntryLink } from "./registry";
import { CustomGetJSONOptions, DEFAULT_GET_JSON_OPTIONS, JSONResponse } from "./skydb";
import { validateOptionalObject, validateString, validateStringLen } from "./utils/validation";

// ====
// JSON
// ====

/**
 * Gets Discoverable JSON set with MySky at the given data path for the given
 * public user ID.
 *
 * @param this - SkynetClient
 * @param userID - The MySky public user ID.
 * @param path - The data path.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - An object containing the json data as well as the skylink for the data.
 */
export async function getJSON(
  this: SkynetClient,
  userID: string,
  path: string,
  customOptions?: CustomGetJSONOptions
): Promise<JSONResponse> {
  validateString("userID", userID, "parameter");
  validateString("path", path, "parameter");
  validateOptionalObject("customOptions", customOptions, "parameter", DEFAULT_GET_JSON_OPTIONS);

  const opts = {
    ...DEFAULT_GET_JSON_OPTIONS,
    ...this.customOptions,
    ...customOptions,
  };

  const dataKey = deriveDiscoverableFileTweak(path);
  opts.hashedDataKeyHex = true; // Do not hash the tweak anymore.

  return await this.db.getJSON(userID, dataKey, opts);
}

// =====
// Entry
// =====

/**
 * Gets the entry link for the entry set with MySky at the given data path, for
 * the given public user ID. This is a v2 skylink. This link stays the same even
 * if the content at the entry changes.
 *
 * @param this - SkynetClient
 * @param userID - The MySky public user ID.
 * @param path - The data path.
 * @returns - The entry link.
 */
export async function getEntryLink(this: SkynetClient, userID: string, path: string): Promise<string> {
  validateString("userID", userID, "parameter");
  validateString("path", path, "parameter");

  const dataKey = deriveDiscoverableFileTweak(path);
  // Do not hash the tweak anymore.
  const opts = { ...DEFAULT_GET_ENTRY_OPTIONS, hashedDataKeyHex: true };

  return registryGetEntryLink(userID, dataKey, opts);
}

/**
 * Gets the entry data for the entry set with MySky at the given data path, for
 * the given public user ID.
 *
 * @param this - SkynetClient
 * @param userID - The MySky public user ID.
 * @param path - The data path.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - The entry data.
 */
export async function getEntryData(
  this: SkynetClient,
  userID: string,
  path: string,
  customOptions?: CustomGetEntryOptions
): Promise<EntryData> {
  validateString("userID", userID, "parameter");
  validateString("path", path, "parameter");
  validateOptionalObject("customOptions", customOptions, "parameter", DEFAULT_GET_ENTRY_OPTIONS);

  const opts = {
    ...DEFAULT_GET_ENTRY_OPTIONS,
    ...this.customOptions,
    ...customOptions,
  };

  const dataKey = deriveDiscoverableFileTweak(path);
  opts.hashedDataKeyHex = true; // Do not hash the tweak anymore.

  const { entry } = await this.registry.getEntry(userID, dataKey, opts);
  if (!entry) {
    return { data: null };
  }
  return { data: entry.data };
}

// ===============
// Encrypted Files
// ===============

/**
 * Gets Encrypted JSON set with MySky at the given data path for the given
 * public user ID.
 *
 * @param this - SkynetClient
 * @param userID - The MySky public user ID.
 * @param pathSeed - The share-able secret path seed.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - An object containing the decrypted json data.
 */
export async function getJSONEncrypted(
  this: SkynetClient,
  userID: string,
  pathSeed: string,
  // TODO: Take a new options type?
  customOptions?: CustomGetJSONOptions
): Promise<EncryptedJSONResponse> {
  validateString("userID", userID, "parameter");
  validateStringLen("pathSeed", pathSeed, "parameter", 64);
  validateOptionalObject("customOptions", customOptions, "parameter", DEFAULT_GET_JSON_OPTIONS);

  const opts = {
    ...DEFAULT_GET_JSON_OPTIONS,
    ...this.customOptions,
    ...customOptions,
    hashedDataKeyHex: true, // Do not hash the tweak anymore.
  };

  // Fetch the raw encrypted JSON data.
  const dataKey = deriveEncryptedFileTweak(pathSeed);
  const { data } = await this.db.getRawBytes(userID, dataKey, opts);
  if (data === null) {
    return { data: null };
  }

  const key = deriveEncryptedFileKeyEntropy(pathSeed);
  const json = decryptJSONFile(data, key);

  return { data: json };
}
