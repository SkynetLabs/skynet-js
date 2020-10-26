import { AxiosResponse } from "axios";
import { SkynetClient } from "./client";
import { defaultOptions, hexToUint8Array } from "./utils";
import { Buffer } from "buffer";
import { PublicKey, Signature } from "./crypto";

const defaultRegistryOptions = {
  ...defaultOptions("/skynet/registry"),
};

export type RegistryEntry = {
  data: string;
  revision: number;
};

export type SignedRegistryEntry = {
  entry: RegistryEntry;
  signature: Signature;
};

export async function lookup(
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

  const userID = publickey.toString("hex");
  let response: AxiosResponse;
  try {
    response = await this.executeRequest({
      ...opts,
      method: "get",
      query: {
        publickey: `ed25519:${userID}`,
        datakey,
      },
    });
  } catch (err: unknown) {
    // unfortunately axios rejects anything that's not >= 200 and < 300
    return null;
  }

  if (response.status === 200) {
    return {
      entry: {
        data: Buffer.from(hexToUint8Array(response.data.data)).toString(),
        revision: parseInt(response.data.revision, 10),
      },
      signature: response.data.signature,
    };
  }
  throw new Error(`unexpected response status code ${response.status}`);
}

export async function update(
  this: SkynetClient,
  publickey: PublicKey,
  datakey: string,
  entry: RegistryEntry,
  signature: Signature,
  customOptions = {}
): Promise<boolean> {
  const opts = {
    ...defaultRegistryOptions,
    ...this.customOptions,
    ...customOptions,
  };

  let response: AxiosResponse;
  try {
    response = await this.executeRequest({
      ...opts,
      method: "post",
      data: {
        publickey: {
          algorithm: "ed25519",
          key: Array.from(publickey),
        },
        datakey,
        revision: entry.revision,
        data: Array.from(Uint8Array.from(Buffer.from(entry.data))),
        signature: Array.from(signature),
      },
    });
  } catch (err: unknown) {
    // unfortunately axios rejects anything that's not >= 200 and < 300
    return false;
  }

  if (response.status === 204) {
    return true;
  }
  throw new Error(`unexpected response status code ${response.status}`);
}
