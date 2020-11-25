import { pki } from "node-forge";
import { AxiosResponse } from "axios";
import { SkynetClient } from "./client";
import { addUrlQuery, BaseCustomOptions, defaultOptions, hexToUint8Array, makeUrl, toHexString } from "./utils";
import { Buffer } from "buffer";
import { hashDataKey, hashRegistryEntry, Signature } from "./crypto";

/**
 * Custom get entry options.
 *
 * @property [timeout=5000] - The custom timeout for getting an entry.
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
  timeout: 5_000,
};

const defaultSetEntryOptions = {
  ...defaultOptions("/skynet/registry"),
};

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
  revision: number;
};

/**
 * Signed registry entry.
 *
 * @property entry - The registry entry.
 * @property signature - The signature of the registry entry.
 */
export type SignedRegistryEntry = {
  entry: RegistryEntry;
  signature: Signature;
};

/**
 * Gets the registry entry corresponding to the publicKey and dataKey.
 *
 * @param this - SkynetClient
 * @param publicKey - The user public key.
 * @param dataKey - The key of the data to fetch for the given user.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - The signed registry entry.
 * @throws - Will throw if the returned signature does not match the returned entry.
 */
export async function getEntry(
  this: SkynetClient,
  publicKey: string,
  dataKey: string,
  customOptions?: CustomGetEntryOptions
): Promise<SignedRegistryEntry | null> {
  const opts = {
    ...defaultGetEntryOptions,
    ...this.customOptions,
    ...customOptions,
  };

  const publicKeyBuffer = Buffer.from(publicKey, "hex");

  let response: AxiosResponse;
  try {
    const url = this.registry.getEntryUrl(publicKey, dataKey, opts);
    response = await this.executeRequest({
      ...opts,
      url,
      method: "get",
      timeout: opts.timeout,
    });
  } catch (err: unknown) {
    // unfortunately axios rejects anything that's not >= 200 and < 300
    return { entry: null, signature: null };
  }

  if (response.status !== 200) {
    return { entry: null, signature: null };
  }

  const signedEntry = {
    entry: {
      datakey: dataKey,
      data: Buffer.from(hexToUint8Array(response.data.data)).toString(),
      // TODO: Handle uint64 properly.
      revision: parseInt(response.data.revision, 10),
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

  const query = {
    publickey: `ed25519:${publicKey}`,
    datakey: toHexString(hashDataKey(dataKey)),
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
 */
export async function setEntry(
  this: SkynetClient,
  privateKey: string,
  entry: RegistryEntry,
  customOptions?: CustomSetEntryOptions
): Promise<void> {
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
    revision: entry.revision,
    data: Array.from(Buffer.from(entry.data)),
    signature: Array.from(signature),
  };

  await this.executeRequest({
    ...opts,
    method: "post",
    data,
  });
}
