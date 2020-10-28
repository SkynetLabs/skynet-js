import { AxiosResponse } from "axios";
import { SkynetClient } from "./client";
import { defaultOptions, hexToUint8Array } from "./utils";
import { Buffer } from "buffer";
import { HashDataKey, PublicKey, Signature } from "./crypto";

const defaultRegistryOptions = {
  ...defaultOptions("/skynet/registry"),
};

export type RegistryEntry = {
  datakey: string;
  data: string;
  revision: number;
};

export type SignedRegistryEntry = {
  entry: RegistryEntry;
  signature: Signature;
};

export async function getEntry(
  this: SkynetClient,
  publickey: PublicKey,
  datakey: string,
  customOptions = {}
): Promise<SignedRegistryEntry | null> {
  const opts = {
    ...defaultRegistryOptions,
    ...this.customOptions,
    ...customOptions,
  };

  let response: AxiosResponse;
  try {
    response = await this.executeRequest({
      ...opts,
      method: "get",
      query: {
        publickey: `ed25519:${publickey.toString("hex")}`,
        datakey: Buffer.from(HashDataKey(datakey)).toString("hex"),
      },
    });
  } catch (err: unknown) {
    // unfortunately axios rejects anything that's not >= 200 and < 300
    return null;
  }

  if (response.status === 200) {
    return {
      entry: {
        datakey,
        data: Buffer.from(hexToUint8Array(response.data.data)).toString(),
        // TODO: Handle uint64 properly.
        revision: parseInt(response.data.revision, 10),
      },
      signature: response.data.signature,
    };
  }
  return null;
}

export async function setEntry(
  this: SkynetClient,
  publickey: PublicKey,
  datakey: string,
  entry: RegistryEntry,
  signature: Signature,
  customOptions = {}
) {
  const opts = {
    ...defaultRegistryOptions,
    ...this.customOptions,
    ...customOptions,
  };

  const data = {
    publickey: {
      algorithm: "ed25519",
      key: Array.from(publickey),
    },
    datakey: Buffer.from(HashDataKey(datakey)).toString("hex"),
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
