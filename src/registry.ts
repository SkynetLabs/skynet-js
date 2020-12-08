import { pki } from "node-forge";
import { AxiosResponse } from "axios";
import { SkynetClient } from "./client";
import {
  addUrlQuery,
  BaseCustomOptions,
  assertUint64,
  defaultOptions,
  hexToUint8Array,
  makeUrl,
  toHexString,
  isHexString,
} from "./utils";
import { Buffer } from "buffer";
import { hashDataKey, hashRegistryEntry, Signature } from "./crypto";

/**
 * Custom get entry options.
 *
 * @property [timeout=5] - The custom timeout for getting an entry, in seconds. The maximum value allowed is 300.
 */
export type CustomGetEntryOptions = BaseCustomOptions & {
  timeout?: number;
};

/**
 * Custom set entry options.
 */
export type CustomSetEntryOptions = BaseCustomOptions;

const defaultGetEntryOptions = {
  ...defaultOptions("/skynet/registry"),
  timeout: 5,
};

const defaultSetEntryOptions = {
  ...defaultOptions("/skynet/registry"),
};

export const MAX_GET_ENTRY_TIMEOUT = 300; // 5 minutes

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
 * @property datakey - The key of the data for the given entry.
 * @property data - The data stored in the entry.
 * @property revision - The revision number for the entry.
 */
export type RegistryEntry = {
  datakey: string;
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
 * @throws - Will throw if the returned signature does not match the returned entry or the provided timeout is invalid.
 */
export async function getEntry(
  this: SkynetClient,
  publicKey: string,
  dataKey: string,
  customOptions?: CustomGetEntryOptions
): Promise<SignedRegistryEntry> {
  /* istanbul ignore next */
  if (typeof publicKey !== "string") {
    throw new Error(`Expected parameter publicKey to be type string, was type ${typeof publicKey}`);
  }
  /* istanbul ignore next */
  if (typeof dataKey !== "string") {
    throw new Error(`Expected parameter dataKey to be type string, was type ${typeof dataKey}`);
  }
  if (!isHexString(publicKey)) {
    throw new Error("Expected parameter publicKey to be a hex-encoded string");
  }

  const opts = {
    ...defaultGetEntryOptions,
    ...this.customOptions,
    ...customOptions,
  };

  const publicKeyBuffer = Buffer.from(publicKey, "hex");
  const url = this.registry.getEntryUrl(publicKey, dataKey, opts);

  let response: AxiosResponse;
  try {
    response = await this.executeRequest({
      ...opts,
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
  } catch (err: unknown) {
    // @ts-expect-error TS complains about err.response
    if (err.response.status === 404) {
      return { entry: null, signature: null };
    }
    // @ts-expect-error TS complains about err.response
    throw new Error(err.response.data.message);
  }

  if (
    typeof response.data.data != "string" ||
    typeof response.data.revision != "string" ||
    typeof response.data.signature != "string"
  ) {
    throw new Error("Did not get a complete entry response");
  }

  const signedEntry = {
    entry: {
      datakey: dataKey,
      data: Buffer.from(hexToUint8Array(response.data.data)).toString(),
      // Convert the revision from a string to bigint.
      revision: BigInt(response.data.revision),
    },
    signature: Buffer.from(hexToUint8Array(response.data.signature)),
  };
  if (
    signedEntry &&
    !pki.ed25519.verify({
      message: hashRegistryEntry(signedEntry.entry),
      signature: signedEntry.signature,
      publicKey: publicKeyBuffer,
    })
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
 * @throws - Will throw if the provided timeout is invalid.
 */
export function getEntryUrl(
  this: SkynetClient,
  publicKey: string,
  dataKey: string,
  customOptions?: CustomGetEntryOptions
): string {
  const opts = {
    ...defaultGetEntryOptions,
    ...this.customOptions,
    ...customOptions,
  };

  const timeout = opts.timeout;

  if (!Number.isInteger(timeout) || timeout > MAX_GET_ENTRY_TIMEOUT || timeout < 1) {
    throw new Error(
      `Invalid 'timeout' parameter '${timeout}', needs to be an integer between 1s and ${MAX_GET_ENTRY_TIMEOUT}s`
    );
  }

  const query = {
    publickey: `ed25519:${publicKey}`,
    datakey: toHexString(hashDataKey(dataKey)),
    timeout,
  };

  let url = makeUrl(this.portalUrl, opts.endpointPath);
  url = addUrlQuery(url, query);

  return url;
}

/**
 * Sets the registry entry.
 *
 * @param this - SkynetClient
 * @param privateKey - The user private key.
 * @param entry - The entry to set.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @throws - Will throw if the entry revision does not fit in 64 bits.
 */
export async function setEntry(
  this: SkynetClient,
  privateKey: string,
  entry: RegistryEntry,
  customOptions?: CustomSetEntryOptions
): Promise<void> {
  /* istanbul ignore next */
  if (typeof privateKey !== "string") {
    throw new Error(`Expected parameter privateKey to be type string, was type ${typeof privateKey}`);
  }
  if (!isHexString(privateKey)) {
    throw new Error("Expected parameter privateKey to be a hex-encoded string");
  }

  // Assert the input is 64 bits.
  assertUint64(entry.revision);

  const opts = {
    ...defaultSetEntryOptions,
    ...this.customOptions,
    ...customOptions,
  };

  const privateKeyBuffer = Buffer.from(privateKey, "hex");

  // Sign the entry.
  const signature = pki.ed25519.sign({
    message: hashRegistryEntry(entry),
    privateKey: privateKeyBuffer,
  });

  const publicKeyBuffer = pki.ed25519.publicKeyFromPrivateKey({ privateKey: privateKeyBuffer });
  const data = {
    publickey: {
      algorithm: "ed25519",
      key: Array.from(publicKeyBuffer),
    },
    datakey: toHexString(hashDataKey(entry.datakey)),
    // Set the revision as a string here since the value may be up to 64 bits.
    // We remove the quotes later in transformRequest.
    revision: entry.revision.toString(),
    data: Array.from(Buffer.from(entry.data)),
    signature: Array.from(signature),
  };

  await this.executeRequest({
    ...opts,
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
