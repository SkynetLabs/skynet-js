/* istanbul ignore file: Much of this functionality is only testable from a browser */

import { EntryData, MySky } from ".";
import {
  decryptJSONFile,
  deriveEncryptedFileKeyEntropy,
  deriveEncryptedFileTweak,
  EncryptedJSONResponse,
  ENCRYPTED_JSON_RESPONSE_VERSION,
  encryptJSONFile,
} from "./encrypted_files";
import {
  CustomGetEntryOptions,
  DEFAULT_GET_ENTRY_OPTIONS,
  DEFAULT_SET_ENTRY_OPTIONS,
  getEntryLink as registryGetEntryLink,
} from "../registry";
import { getNextRegistryEntry, getOrCreateRawBytesRegistryEntry, getOrCreateRegistryEntry } from "../skydb";
import {
  CustomGetJSONOptions,
  CustomSetEntryDataOptions,
  CustomSetJSONOptions,
  DEFAULT_GET_JSON_OPTIONS,
  DEFAULT_SET_ENTRY_DATA_OPTIONS,
  DEFAULT_SET_JSON_OPTIONS,
  DELETION_ENTRY_DATA,
  JSONResponse,
  validateEntryData,
} from "../skydb_v2";
import { deriveDiscoverableFileTweak } from "./tweak";
import { decodeSkylink } from "../skylink/sia";
import { extractOptions } from "../utils/options";
import { JsonData } from "../utils/types";
import {
  validateObject,
  validateOptionalObject,
  validateSkylinkString,
  validateString,
  validateUint8Array,
} from "../utils/validation";

// =============
// SkyDB methods
// =============

/**
 * Gets Discoverable JSON at the given path through MySky, if the user has
 * given Discoverable Read permissions to do so.
 *
 * @param this - MySky instance.
 * @param path - The data path.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - An object containing the json data as well as the skylink for the data.
 * @throws - Will throw if the user does not have Discoverable Read permission on the path.
 * @deprecated - Use of this method may result in data race bugs. Reworking your application to use `mySky.dbV2.getJSON` is recommended.
 */
export async function getJSON(this: MySky, path: string, customOptions?: CustomGetJSONOptions): Promise<JSONResponse> {
  validateString("path", path, "parameter");
  validateOptionalObject("customOptions", customOptions, "parameter", DEFAULT_GET_JSON_OPTIONS);

  const opts = {
    ...DEFAULT_GET_JSON_OPTIONS,
    ...this.connector.client.customOptions,
    ...customOptions,
  };

  const publicKey = await this.userID();
  const dataKey = deriveDiscoverableFileTweak(path);
  opts.hashedDataKeyHex = true; // Do not hash the tweak anymore.

  return await this.connector.client.db.getJSON(publicKey, dataKey, opts);
}

/**
 * Gets the entry link for the entry at the given path. This is a v2 skylink.
 * This link stays the same even if the content at the entry changes.
 *
 * @param this - MySky instance.
 * @param path - The data path.
 * @returns - The entry link.
 * @deprecated - Use of this method may result in data race bugs. Reworking your application to use `mySky.dbV2.getEntryLink` is recommended.
 */
export async function getEntryLink(this: MySky, path: string): Promise<string> {
  validateString("path", path, "parameter");

  const publicKey = await this.userID();
  const dataKey = deriveDiscoverableFileTweak(path);
  // Do not hash the tweak anymore.
  const opts = { ...DEFAULT_GET_ENTRY_OPTIONS, hashedDataKeyHex: true };

  return registryGetEntryLink(publicKey, dataKey, opts);
}

/**
 * Sets Discoverable JSON at the given path through MySky, if the user has
 * given Discoverable Write permissions to do so.
 *
 * @param this - MySky instance.
 * @param path - The data path.
 * @param json - The json to set.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - An object containing the json data as well as the skylink for the data.
 * @throws - Will throw if the user does not have Discoverable Write permission on the path.
 * @deprecated - Use of this method may result in data race bugs. Reworking your application to use `mySky.dbV2.setJSON` is recommended.
 */
export async function setJSON(
  this: MySky,
  path: string,
  json: JsonData,
  customOptions?: CustomSetJSONOptions
): Promise<JSONResponse> {
  validateString("path", path, "parameter");
  validateObject("json", json, "parameter");
  validateOptionalObject("customOptions", customOptions, "parameter", DEFAULT_SET_JSON_OPTIONS);

  const opts = {
    ...DEFAULT_SET_JSON_OPTIONS,
    ...this.connector.client.customOptions,
    ...customOptions,
  };

  const publicKey = await this.userID();
  const dataKey = deriveDiscoverableFileTweak(path);
  opts.hashedDataKeyHex = true; // Do not hash the tweak anymore.

  const [entry, dataLink] = await getOrCreateRegistryEntry(this.connector.client, publicKey, dataKey, json, opts);

  const signature = await this.signRegistryEntry(entry, path);

  const setEntryOpts = extractOptions(opts, DEFAULT_SET_ENTRY_OPTIONS);
  await this.connector.client.registry.postSignedEntry(publicKey, entry, signature, setEntryOpts);

  return { data: json, dataLink };
}

/**
 * Deletes Discoverable JSON at the given path through MySky, if the user has
 * given Discoverable Write permissions to do so.
 *
 * @param this - MySky instance.
 * @param path - The data path.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - An empty promise.
 * @throws - Will throw if the revision is already the maximum value.
 * @throws - Will throw if the user does not have Discoverable Write permission on the path.
 * @deprecated - Use of this method may result in data race bugs. Reworking your application to use `mySky.dbV2.deleteJSON` is recommended.
 */
export async function deleteJSON(this: MySky, path: string, customOptions?: CustomSetEntryDataOptions): Promise<void> {
  // Validation is done below in `setEntryData`.

  const opts = {
    ...DEFAULT_SET_ENTRY_DATA_OPTIONS,
    ...this.connector.client.customOptions,
    ...customOptions,
  };

  await this.setEntryData(path, DELETION_ENTRY_DATA, { ...opts, allowDeletionEntryData: true });
}

// ==================
// Entry Data Methods
// ==================

/**
 * Sets entry at the given path to point to the data link. Like setJSON, but it doesn't upload a file.
 *
 * @param this - MySky instance.
 * @param path - The data path.
 * @param dataLink - The data link to set at the path.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - An empty promise.
 * @throws - Will throw if the user does not have Discoverable Write permission on the path.
 * @deprecated - Use of this method may result in data race bugs. Reworking your application to use `mySky.dbV2.setDataLink` is recommended.
 */
export async function setDataLink(
  this: MySky,
  path: string,
  dataLink: string,
  customOptions?: CustomSetEntryDataOptions
): Promise<void> {
  const parsedSkylink = validateSkylinkString("dataLink", dataLink, "parameter");
  // Rest of validation is done below in `setEntryData`.

  const data = decodeSkylink(parsedSkylink);

  await this.setEntryData(path, data, customOptions);
}

/**
 * Gets the raw registry entry data for the given path, if the user has given
 * Discoverable Read permissions.
 *
 * @param this - MySky instance.
 * @param path - The data path.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - The entry data.
 * @throws - Will throw if the user does not have Discoverable Read permission on the path.
 * @deprecated - Use of this method may result in data race bugs. Reworking your application to use `mySky.dbV2.getEntryData` is recommended.
 */
export async function getEntryData(
  this: MySky,
  path: string,
  customOptions?: CustomGetEntryOptions
): Promise<EntryData> {
  validateString("path", path, "parameter");
  validateOptionalObject("customOptions", customOptions, "parameter", DEFAULT_GET_ENTRY_OPTIONS);

  const opts = {
    ...DEFAULT_GET_ENTRY_OPTIONS,
    ...this.connector.client.customOptions,
    ...customOptions,
  };

  const publicKey = await this.userID();
  const dataKey = deriveDiscoverableFileTweak(path);
  opts.hashedDataKeyHex = true; // Do not hash the tweak anymore.

  return await this.connector.client.db.getEntryData(publicKey, dataKey, opts);
}

/**
 * Sets the raw registry entry data at the given path, if the user has given Discoverable
 * Write permissions.
 *
 * @param this - MySky instance.
 * @param path - The data path.
 * @param data - The raw entry data to set.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - The entry data.
 * @throws - Will throw if the length of the data is > 70 bytes.
 * @throws - Will throw if the user does not have Discoverable Write permission on the path.
 * @deprecated - Use of this method may result in data race bugs. Reworking your application to use `mySky.dbV2.setEntryData` is recommended.
 */
export async function setEntryData(
  this: MySky,
  path: string,
  data: Uint8Array,
  customOptions?: CustomSetEntryDataOptions
): Promise<EntryData> {
  validateString("path", path, "parameter");
  validateUint8Array("data", data, "parameter");
  validateOptionalObject("customOptions", customOptions, "parameter", DEFAULT_SET_ENTRY_DATA_OPTIONS);

  const opts = {
    ...DEFAULT_SET_ENTRY_DATA_OPTIONS,
    ...this.connector.client.customOptions,
    ...customOptions,
  };

  validateEntryData(data, opts.allowDeletionEntryData);

  const publicKey = await this.userID();
  const dataKey = deriveDiscoverableFileTweak(path);
  opts.hashedDataKeyHex = true; // Do not hash the tweak anymore.

  const getEntryOpts = extractOptions(opts, DEFAULT_GET_ENTRY_OPTIONS);
  const entry = await getNextRegistryEntry(this.connector.client, publicKey, dataKey, data, getEntryOpts);

  const signature = await this.signRegistryEntry(entry, path);

  const setEntryOpts = extractOptions(opts, DEFAULT_SET_ENTRY_OPTIONS);
  await this.connector.client.registry.postSignedEntry(publicKey, entry, signature, setEntryOpts);

  return { data: entry.data };
}

/**
 * Deletes the entry data at the given path, if the user has given Discoverable
 * Write permissions.
 *
 * @param this - MySky instance.
 * @param path - The data path.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - An empty promise.
 * @throws - Will throw if the user does not have Discoverable Write permission on the path.
 * @deprecated - Use of this method may result in data race bugs. Reworking your application to use `mySky.dbV2.deleteEntryData` is recommended.
 */
export async function deleteEntryData(
  this: MySky,
  path: string,
  customOptions?: CustomSetEntryDataOptions
): Promise<void> {
  // Validation is done in `setEntryData`.

  await this.setEntryData(path, DELETION_ENTRY_DATA, { ...customOptions, allowDeletionEntryData: true });
}

// ===============
// Encrypted Files
// ===============

/**
 * Gets Encrypted JSON at the given path through MySky, if the user has given
 * Hidden Read permissions to do so.
 *
 * @param this - MySky instance.
 * @param path - The data path.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - An object containing the decrypted json data.
 * @throws - Will throw if the user does not have Hidden Read permission on the path.
 * @deprecated - Use of this method may result in data race bugs. Reworking your application to use `mySky.dbV2.getJSONEncrypted` is recommended.
 */
export async function getJSONEncrypted(
  this: MySky,
  path: string,
  customOptions?: CustomGetJSONOptions
): Promise<EncryptedJSONResponse> {
  validateString("path", path, "parameter");
  validateOptionalObject("customOptions", customOptions, "parameter", DEFAULT_GET_JSON_OPTIONS);

  const opts = {
    ...DEFAULT_GET_JSON_OPTIONS,
    ...this.connector.client.customOptions,
    ...customOptions,
    hashedDataKeyHex: true, // Do not hash the tweak anymore.
  };

  // Call MySky which checks for read permissions on the path.
  const [publicKey, pathSeed] = await Promise.all([this.userID(), this.getEncryptedPathSeed(path, false)]);

  // Fetch the raw encrypted JSON data.
  const dataKey = deriveEncryptedFileTweak(pathSeed);
  const { data } = await this.connector.client.db.getRawBytes(publicKey, dataKey, opts);
  if (data === null) {
    return { data: null };
  }

  const encryptionKey = deriveEncryptedFileKeyEntropy(pathSeed);
  const json = decryptJSONFile(data, encryptionKey);

  return { data: json };
}

/**
 * Sets Encrypted JSON at the given path through MySky, if the user has given
 * Hidden Write permissions to do so.
 *
 * @param this - MySky instance.
 * @param path - The data path.
 * @param json - The json to encrypt and set.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - An object containing the original json data.
 * @throws - Will throw if the user does not have Hidden Write permission on the path.
 * @deprecated - Use of this method may result in data race bugs. Reworking your application to use `mySky.dbV2.setJSONEncrypted` is recommended.
 */
export async function setJSONEncrypted(
  this: MySky,
  path: string,
  json: JsonData,
  customOptions?: CustomSetJSONOptions
): Promise<EncryptedJSONResponse> {
  validateString("path", path, "parameter");
  validateObject("json", json, "parameter");
  validateOptionalObject("customOptions", customOptions, "parameter", DEFAULT_SET_JSON_OPTIONS);

  const opts = {
    ...DEFAULT_SET_JSON_OPTIONS,
    ...this.connector.client.customOptions,
    ...customOptions,
  };

  // Call MySky which checks for read permissions on the path.
  const [publicKey, pathSeed] = await Promise.all([this.userID(), this.getEncryptedPathSeed(path, false)]);
  const dataKey = deriveEncryptedFileTweak(pathSeed);
  opts.hashedDataKeyHex = true; // Do not hash the tweak anymore.
  const encryptionKey = deriveEncryptedFileKeyEntropy(pathSeed);

  // Pad and encrypt json file.
  const data = encryptJSONFile(json, { version: ENCRYPTED_JSON_RESPONSE_VERSION }, encryptionKey);

  const entry = await getOrCreateRawBytesRegistryEntry(this.connector.client, publicKey, dataKey, data, opts);

  // Call MySky which checks for write permissions on the path.
  const signature = await this.signEncryptedRegistryEntry(entry, path);

  const setEntryOpts = extractOptions(opts, DEFAULT_SET_ENTRY_OPTIONS);
  await this.connector.client.registry.postSignedEntry(publicKey, entry, signature, setEntryOpts);

  return { data: json };
}
