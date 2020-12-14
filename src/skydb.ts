import { pki } from "node-forge";
import { SkynetClient } from "./client";
import { CustomGetEntryOptions, RegistryEntry, SignedRegistryEntry, CustomSetEntryOptions } from "./registry";
import {
  trimUriPrefix,
  uriSkynetPrefix,
  toHexString,
  assertUint64,
  MAX_REVISION,
  BaseCustomOptions,
  isHexString,
} from "./utils";
import { Buffer } from "buffer";
import { CustomUploadOptions } from "./upload";
import { CustomDownloadOptions } from "./download";

/**
 * Custom get JSON options.
 */
export type CustomGetJSONOptions = BaseCustomOptions & CustomGetEntryOptions & CustomDownloadOptions;

/**
 * Custom set JSON options.
 */
export type CustomSetJSONOptions = BaseCustomOptions & CustomSetEntryOptions & CustomUploadOptions;

export type VersionedEntryData = {
  data: Record<string, unknown> | null;
  revision: bigint | null;
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
): Promise<VersionedEntryData> {
  const opts = {
    ...this.customOptions,
    ...customOptions,
  };

  // Lookup the registry entry.
  const { entry }: { entry: RegistryEntry } = await this.registry.getEntry(publicKey, dataKey, opts);
  if (entry === null) {
    return { data: null, revision: null };
  }

  // Download the data in that Skylink.
  const skylink = entry.data;
  const { data } = await this.getFileContent<Record<string, unknown>>(skylink, opts);

  if (typeof data !== "object" || data === null) {
    throw new Error(`File data for the entry at data key '${dataKey}' is not JSON.`);
  }

  return { data, revision: entry.revision };
}

/**
 * Sets a JSON object at the registry entry corresponding to the publicKey and dataKey.
 *
 * @param this - SkynetClient
 * @param privateKey - The user private key.
 * @param dataKey - The key of the data to fetch for the given user.
 * @param json - The JSON data to set.
 * @param [revision] - The revision number for the data entry.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @throws - Will throw if the given entry revision does not fit in 64 bits, or if the revision was not given, if the latest revision of the entry is the maximum revision allowed.
 */
export async function setJSON(
  this: SkynetClient,
  privateKey: string,
  dataKey: string,
  json: Record<string, unknown>,
  revision?: bigint,
  customOptions?: CustomSetJSONOptions
): Promise<void> {
  /* istanbul ignore next */
  if (typeof privateKey !== "string") {
    throw new Error(`Expected parameter privateKey to be type string, was type ${typeof privateKey}`);
  }
  /* istanbul ignore next */
  if (typeof dataKey !== "string") {
    throw new Error(`Expected parameter dataKey to be type string, was type ${typeof dataKey}`);
  }
  if (!isHexString(privateKey)) {
    throw new Error("Expected parameter privateKey to be a hex-encoded string");
  }
  if (typeof json !== "object" || json === null) {
    throw new Error("Expected parameter json to be an object");
  }

  const opts = {
    ...this.customOptions,
    ...customOptions,
  };

  const privateKeyBuffer = Buffer.from(privateKey, "hex");

  if (revision === undefined) {
    // fetch the current value to find out the revision.
    const publicKey = pki.ed25519.publicKeyFromPrivateKey({ privateKey: privateKeyBuffer });
    const entry: SignedRegistryEntry = await this.registry.getEntry(toHexString(publicKey), dataKey, opts);
    if (entry.entry === null) {
      revision = BigInt(0);
    } else {
      revision = entry.entry.revision + BigInt(1);
    }

    // Throw if the revision is already the maximum value.
    if (revision > MAX_REVISION) {
      throw new Error("Current entry already has maximum allowed revision, could not update the entry");
    }
  } else {
    // Assert the input is 64 bits.
    assertUint64(revision);
  }

  // Upload the data to acquire its skylink.
  const file = new File([JSON.stringify(json)], dataKey, { type: "application/json" });
  const skylink = await this.uploadFile(file, opts);

  // build the registry value
  const entry: RegistryEntry = {
    datakey: dataKey,
    data: trimUriPrefix(skylink, uriSkynetPrefix),
    revision,
  };

  // Update the registry.
  await this.registry.setEntry(privateKey, entry);
}
