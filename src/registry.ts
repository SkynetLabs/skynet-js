import type { AxiosResponse } from "axios";
import { Buffer } from "buffer";
import { sign } from "tweetnacl";

import { SkynetClient } from "./client";
import { assertUint64 } from "./utils/number";
import { BaseCustomOptions, defaultBaseOptions } from "./utils/options";
import { hexToUint8Array, toHexString, uint8ArrayToStringUtf8 } from "./utils/string";
import { getEntryUrlForPortal } from "./utils/url";
import { hashDataKey, hashRegistryEntry, Signature } from "./crypto";
import {
  validateBigint,
  validateHexString,
  validateObject,
  validateOptionalObject,
  validateString,
} from "./utils/validation";

/**
 * Custom get entry options.
 *
 * @property [endpointGetEntry] - The relative URL path of the portal endpoint to contact.
 * @property [hashedDataKeyHex] - Whether the data key is already hashed and in hex format. If not, we hash the data key.
 */
export type CustomGetEntryOptions = BaseCustomOptions & {
  endpointGetEntry?: string;
  hashedDataKeyHex?: boolean;
};

/**
 * Custom set entry options.
 *
 * @property [endpointSetEntry] - The relative URL path of the portal endpoint to contact.
 * @property [hashedDataKeyHex] - Whether the data key is already hashed and in hex format. If not, we hash the data key.
 */
export type CustomSetEntryOptions = BaseCustomOptions & {
  endpointSetEntry?: string;
  hashedDataKeyHex?: boolean;
};

export const defaultGetEntryOptions = {
  ...defaultBaseOptions,
  endpointGetEntry: "/skynet/registry",
  hashedDataKeyHex: false,
};

export const defaultSetEntryOptions = {
  ...defaultBaseOptions,
  endpointSetEntry: "/skynet/registry",
  hashedDataKeyHex: false,
};

export const DEFAULT_GET_ENTRY_TIMEOUT = 5; // 5 seconds

/**
 * Regex for JSON revision value without quotes.
 */
export const regexRevisionNoQuotes = /"revision":\s*([0-9]+)/;

/**
 * Regex for JSON revision value with quotes.
 */
const regexRevisionWithQuotes = /"revision":\s*"([0-9]+)"/;

/**
 * Registry entry.
 *
 * @property dataKey - The key of the data for the given entry.
 * @property data - The data stored in the entry.
 * @property revision - The revision number for the entry.
 */
export type RegistryEntry = {
  dataKey: string;
  data: string;
  revision: bigint;
};

/**
 * Signed registry entry.
 *
 * @property entry - The registry entry.
 * @property signature - The signature of the registry entry.
 */
export type SignedRegistryEntry = {
  entry: RegistryEntry | null;
  signature: Signature | null;
};

/**
 * Gets the registry entry corresponding to the publicKey and dataKey.
 *
 * @param this - SkynetClient
 * @param publicKey - The user public key.
 * @param dataKey - The key of the data to fetch for the given user.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - The signed registry entry.
 * @throws - Will throw if the returned signature does not match the returned entry or the provided timeout is invalid or the given key is not valid.
 */
export async function getEntry(
  this: SkynetClient,
  publicKey: string,
  dataKey: string,
  customOptions?: CustomGetEntryOptions
): Promise<SignedRegistryEntry> {
  // Validation is done in `getEntryUrl`.

  const opts = {
    ...defaultGetEntryOptions,
    ...this.customOptions,
    ...customOptions,
  };

  const url = await this.registry.getEntryUrl(publicKey, dataKey, opts);

  let response: AxiosResponse;
  try {
    response = await this.executeRequest({
      ...opts,
      endpointPath: opts.endpointGetEntry,
      url,
      method: "get",
      // Transform the response to add quotes, since uint64 cannot be accurately
      // read by JS so the revision needs to be parsed as a string.
      transformResponse: function (data: string) {
        if (data === undefined) {
          return {};
        }
        // Change the revision value from a JSON integer to a string.
        data = data.replace(regexRevisionNoQuotes, '"revision":"$1"');
        // Convert the JSON data to an object.
        return JSON.parse(data);
      },
    });
  } catch (err) {
    // TODO: Refactor this validation into a separate function.
    /* istanbul ignore next */
    if (!err.response) {
      throw new Error(`Error response not found. Full error: ${err}`);
    }
    /* istanbul ignore next */
    if (!err.response.status) {
      throw new Error(`Error response did not contain expected field 'status'. Full error: ${err}`);
    }
    // Check if status was 404 "not found" and return null if so.
    if (err.response.status === 404) {
      return { entry: null, signature: null };
    }

    /* istanbul ignore next */
    if (!err.response.data) {
      throw new Error(
        `Error response did not contain expected field 'data'. Status code: ${err.response.status}. Full error: ${err}`
      );
    }
    /* istanbul ignore next */
    if (!err.response.data.message) {
      throw new Error(
        `Error response did not contained expected fields 'data.message'. Status code: ${err.response.status}. Full error: ${err}`
      );
    }
    // Return the error message from the response.
    throw new Error(err.response.data.message);
  }

  // Sanity check.
  try {
    validateString("response.data.data", response.data.data, "entry response field");
    validateString("response.data.revision", response.data.revision, "entry response field");
    validateString("response.data.signature", response.data.signature, "entry response field");
  } catch (err) {
    throw new Error(
      `Did not get a complete entry response despite a successful request. Please try again and report this issue to the devs if it persists. Error: ${err}`
    );
  }

  // Use empty string if the data is empty.
  let data = "";
  if (response.data.data) {
    data = uint8ArrayToStringUtf8(hexToUint8Array(response.data.data));
  }
  const signedEntry = {
    entry: {
      dataKey,
      data,
      // Convert the revision from a string to bigint.
      revision: BigInt(response.data.revision),
    },
    signature: Buffer.from(hexToUint8Array(response.data.signature)),
  };
  if (
    signedEntry &&
    !sign.detached.verify(
      hashRegistryEntry(signedEntry.entry, opts.hashedDataKeyHex),
      new Uint8Array(signedEntry.signature),
      hexToUint8Array(publicKey)
    )
  ) {
    throw new Error("could not verify signature from retrieved, signed registry entry -- possible corrupted entry");
  }

  return signedEntry;
}

/**
 * Gets the registry entry URL corresponding to the publicKey and dataKey.
 *
 * @param this - SkynetClient
 * @param publicKey - The user public key.
 * @param dataKey - The key of the data to fetch for the given user.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - The full get entry URL.
 * @throws - Will throw if the provided timeout is invalid or the given key is not valid.
 */
export async function getEntryUrl(
  this: SkynetClient,
  publicKey: string,
  dataKey: string,
  customOptions?: CustomGetEntryOptions
): Promise<string> {
  // Validation is done in `getEntryUrlForPortal`.

  const opts = {
    ...defaultGetEntryOptions,
    ...this.customOptions,
    ...customOptions,
  };

  const portalUrl = await this.portalUrl();

  return getEntryUrlForPortal(portalUrl, publicKey, dataKey, opts);
}

/**
 * Sets the registry entry.
 *
 * @param this - SkynetClient
 * @param privateKey - The user private key.
 * @param entry - The entry to set.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @throws - Will throw if the entry revision does not fit in 64 bits or the given key is not valid.
 */
export async function setEntry(
  this: SkynetClient,
  privateKey: string,
  entry: RegistryEntry,
  customOptions?: CustomSetEntryOptions
): Promise<void> {
  validateHexString("privateKey", privateKey, "parameter");
  validateRegistryEntry("entry", entry, "parameter");
  validateOptionalObject("customOptions", customOptions, "parameter", defaultSetEntryOptions);

  // Assert the input is 64 bits.
  assertUint64(entry.revision);

  const opts = {
    ...defaultSetEntryOptions,
    ...this.customOptions,
    ...customOptions,
  };

  const privateKeyArray = hexToUint8Array(privateKey);
  const signature: Uint8Array = await signEntry(privateKey, entry, opts.hashedDataKeyHex);
  const { publicKey: publicKeyArray } = sign.keyPair.fromSecretKey(privateKeyArray);

  return await this.registry.postSignedEntry(toHexString(publicKeyArray), entry, signature, opts);
}

export async function signEntry(
  privateKey: string,
  entry: RegistryEntry,
  hashedDataKeyHex: boolean
): Promise<Uint8Array> {
  // TODO: Publicly available, validate input.

  const privateKeyArray = hexToUint8Array(privateKey);

  // Sign the entry.
  // TODO: signature type should be Signature?
  return sign(hashRegistryEntry(entry, hashedDataKeyHex), privateKeyArray);
}

export async function postSignedEntry(
  this: SkynetClient,
  publicKey: string,
  entry: RegistryEntry,
  signature: Uint8Array,
  customOptions?: CustomSetEntryOptions
): Promise<void> {
  validateHexString("publicKey", publicKey, "parameter");
  // TODO: Validate entry and signature
  validateString("entry.dataKey", entry.dataKey, "parameter");
  validateOptionalObject("customOptions", customOptions, "parameter", defaultSetEntryOptions);

  const opts = {
    ...defaultSetEntryOptions,
    ...this.customOptions,
    ...customOptions,
  };

  // Hash and hex encode the given data key if it is not a hash already.
  let datakey = entry.dataKey;
  if (!opts.hashedDataKeyHex) {
    datakey = toHexString(hashDataKey(entry.dataKey));
  }
  const data = {
    publickey: {
      algorithm: "ed25519",
      key: Array.from(hexToUint8Array(publicKey)),
    },
    datakey,
    // Set the revision as a string here since the value may be up to 64 bits.
    // We remove the quotes later in transformRequest.
    revision: entry.revision.toString(),
    data: Array.from(Buffer.from(entry.data)),
    signature: Array.from(signature),
  };

  await this.executeRequest({
    ...opts,
    endpointPath: opts.endpointSetEntry,
    method: "post",
    data,
    // Transform the request to remove quotes, since the revision needs to be
    // parsed as a uint64 on the Go side.
    transformRequest: function (data: unknown) {
      // Convert the object data to JSON.
      const json = JSON.stringify(data);
      // Change the revision value from a string to a JSON integer.
      return json.replace(regexRevisionWithQuotes, '"revision":$1');
    },
  });
}

export function validateRegistryEntry(name: string, value: unknown, valueKind: string): void {
  validateObject(name, value, valueKind);
  validateString(`${name}.dataKey`, (value as RegistryEntry).dataKey, `${valueKind} field`);
  validateString(`${name}.data`, (value as RegistryEntry).data, `${valueKind} field`);
  validateBigint(`${name}.revision`, (value as RegistryEntry).revision, `${valueKind} field`);
}
