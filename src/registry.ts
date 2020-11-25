import { pki } from "node-forge";
import { AxiosResponse } from "axios";
import { SkynetClient } from "./client";
import { addUrlQuery, checkUint64, defaultOptions, hexToUint8Array, makeUrl, toHexString } from "./utils";
import { Buffer } from "buffer";
import { hashDataKey, hashRegistryEntry, Signature } from "./crypto";

const defaultGetEntryOptions = {
  ...defaultOptions("/skynet/registry"),
  timeout: 5_000,
};

const defaultSetEntryOptions = {
  ...defaultOptions("/skynet/registry"),
};

export type RegistryEntry = {
  datakey: string;
  data: string;
  revision: bigint;
};

export type SignedRegistryEntry = {
  entry: RegistryEntry;
  signature: Signature;
};

/**
 * Gets the registry entry corresponding to the publicKey and dataKey.
 * @param publicKey - The user public key.
 * @param dataKey - The key of the data to fetch for the given user.
 * @param [customOptions={}] - Additional settings that can optionally be set.
 * @param [customOptions.timeout=5000] - Timeout in ms for the registry lookup.
 */
export async function getEntry(
  this: SkynetClient,
  publicKey: string,
  dataKey: string,
  customOptions = {}
): Promise<SignedRegistryEntry | null> {
  const opts = {
    ...defaultGetEntryOptions,
    ...this.customOptions,
    ...customOptions,
  };

  const publicKeyBuffer = Buffer.from(publicKey, "hex");

  let response: AxiosResponse;
  try {
    response = await this.executeRequest({
      ...opts,
      method: "get",
      query: {
        publickey: `ed25519:${publicKey}`,
        datakey: toHexString(hashDataKey(dataKey)),
      },
      timeout: opts.timeout,
      // Transform the response to add quotes, since uint64 cannot be accurately
      // read by JS so the revision needs to be parsed as a string.
      transformResponse: function (data: string) {
        // Change the revision value from a JSON integer to a string.
        data = data.replace(/"revision":([0-9]+)/, '"revision":"$1"');
        // Convert the JSON data to an object.
        return JSON.parse(data);
      },
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

export function getEntryUrl(this: SkynetClient, publicKey: string, dataKey: string, customOptions = {}): string {
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

export async function setEntry(
  this: SkynetClient,
  privateKey: string,
  entry: RegistryEntry,
  customOptions = {}
): Promise<void> {
  // Assert the input is 64 bits.
  checkUint64(entry.revision);

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
      return json.replace(/"revision":"([0-9]+)"/, '"revision":$1');
    },
  });
}
