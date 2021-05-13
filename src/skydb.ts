import { sign } from "tweetnacl";

import { SkynetClient } from "./client";
import {
  defaultGetEntryOptions,
  defaultSetEntryOptions,
  CustomGetEntryOptions,
  RegistryEntry,
  SignedRegistryEntry,
  CustomSetEntryOptions,
} from "./registry";
import { assertUint64, MAX_REVISION } from "./utils/number";
import { uriSkynetPrefix } from "./utils/url";
import { hexToUint8Array, trimUriPrefix, toHexString, stringToUint8ArrayUtf8 } from "./utils/string";
import { defaultUploadOptions, CustomUploadOptions, UploadRequestResponse } from "./upload";
import { defaultDownloadOptions, CustomDownloadOptions } from "./download";
import { validateHexString, validateObject, validateOptionalObject, validateString } from "./utils/validation";
import { defaultBaseOptions, extractOptions } from "./utils/options";
import { formatSkylink } from "./skylink/format";
import { parseSkylink } from "./skylink/parse";

export const JSON_RESPONSE_VERSION = 2;

export type JsonData = Record<string, unknown>;

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

/**
 * Gets the JSON object corresponding to the publicKey and dataKey.
 *
 * @param this - SkynetClient
 * @param publicKey - The user public key.
 * @param dataKey - The key of the data to fetch for the given user.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - The returned JSON and revision number.
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
  const getEntryOpts = extractOptions(opts, defaultGetEntryOptions);
  const { entry }: { entry: RegistryEntry | null } = await this.registry.getEntry(publicKey, dataKey, getEntryOpts);
  if (entry === null) {
    return { data: null, dataLink: null };
  }
  const rawDataLink = entry.data;
  const dataLink = formatSkylink(rawDataLink);

  // If a cached data link is provided and the data link hasn't changed, return.
  if (opts.cachedDataLink && rawDataLink === parseSkylink(opts.cachedDataLink)) {
    return { data: null, dataLink };
  }

  // Download the data in the returned data link.
  const downloadOpts = extractOptions(opts, defaultDownloadOptions);
  const { data } = await this.getFileContent<JsonData>(dataLink, downloadOpts);

  if (typeof data !== "object" || data === null) {
    throw new Error(`File data for the entry at data key '${dataKey}' is not JSON.`);
  }

  if (!(data["_data"] && data["_v"])) {
    // Legacy data prior to v4, return as-is.
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

  const [entry, skylink] = await getOrCreateRegistryEntry(this, publicKeyArray, dataKey, json, opts);

  // Update the registry.
  const setEntryOpts = extractOptions(opts, defaultSetEntryOptions);
  await this.registry.setEntry(privateKey, entry, setEntryOpts);

  return { data: json, dataLink: formatSkylink(skylink) };
}

export async function getOrCreateRegistryEntry(
  client: SkynetClient,
  publicKeyArray: Uint8Array,
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
  const data = { _data: json, _v: JSON_RESPONSE_VERSION };

  // Create the data to upload to acquire its skylink.
  let dataKeyHex = dataKey;
  if (!opts.hashedDataKeyHex) {
    dataKeyHex = toHexString(stringToUint8ArrayUtf8(dataKey));
  }
  const file = new File([JSON.stringify(data)], `dk:${dataKeyHex}`, { type: "application/json" });

  // Start file upload, do not block.
  const uploadOpts = extractOptions(opts, defaultUploadOptions);
  const skyfilePromise: Promise<UploadRequestResponse> = client.uploadFile(file, uploadOpts);

  // Fetch the current value to find out the revision.
  //
  // Start getEntry, do not block.
  const getEntryOpts = extractOptions(opts, defaultGetEntryOptions);
  const entryPromise: Promise<SignedRegistryEntry> = client.registry.getEntry(
    toHexString(publicKeyArray),
    dataKey,
    getEntryOpts
  );

  // Block until both getEntry and uploadFile are finished.
  const [signedEntry, skyfile] = await Promise.all<SignedRegistryEntry, UploadRequestResponse>([
    entryPromise,
    skyfilePromise,
  ]);

  let revision: bigint;
  if (signedEntry.entry === null) {
    revision = BigInt(0);
  } else {
    revision = signedEntry.entry.revision + BigInt(1);
  }

  // Throw if the revision is already the maximum value.
  if (revision > MAX_REVISION) {
    throw new Error("Current entry already has maximum allowed revision, could not update the entry");
  }

  // Assert the input is 64 bits.
  assertUint64(revision);

  // Build the registry value.
  const dataLink = skyfile.skylink;
  const entry: RegistryEntry = {
    dataKey,
    data: trimUriPrefix(dataLink, uriSkynetPrefix),
    revision,
  };
  return [entry, formatSkylink(dataLink)];
}
