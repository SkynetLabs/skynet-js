import { pki } from "node-forge";
import { AxiosResponse } from "axios";
import { SkynetClient } from "./client";
import { FileID, User } from "./skydb";
import { defaultOptions, hexToUint8Array } from "./utils";
import { Buffer } from "buffer";

const defaultRegistryOptions = {
  ...defaultOptions("/skynet/registry"),
};

export type RegistryValue = {
  tweak: Uint8Array;
  data: string;
  revision: number;
};

export type SignedRegistryValue = {
  value: RegistryValue;
  signature: pki.ed25519.NativeBuffer;
};

export async function lookupRegistry(
  this: SkynetClient,
  user: User,
  fileID: FileID,
  customOptions = {}
): Promise<SignedRegistryValue | null> {
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
        publickey: `ed25519:${user.id}`,
        fileid: Buffer.from(
          JSON.stringify({
            version: fileID.version,
            applicationid: fileID.applicationID,
            filetype: fileID.fileType,
            filename: fileID.filename,
          })
        ).toString("hex"),
      },
    });
  } catch (err: unknown) {
    // unfortunately axios rejects anything that's not >= 200 and < 300
    return null;
  }

  if (response.status === 200) {
    return {
      value: {
        tweak: Uint8Array.from(Buffer.from(response.data.tweak)),
        data: Buffer.from(hexToUint8Array(response.data.data)).toString(),
        revision: parseInt(response.data.revision, 10),
      },
      signature: response.data.signature,
    };
  }
  throw new Error(`unexpected response status code ${response.status}`);
}

export async function updateRegistry(
  this: SkynetClient,
  user: User,
  fileID: FileID,
  srv: SignedRegistryValue,
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
          key: Array.from(user.publicKey),
        },
        fileid: {
          version: fileID.version,
          applicationid: fileID.applicationID,
          filetype: fileID.fileType,
          filename: fileID.filename,
        },
        revision: srv.value.revision,
        data: Array.from(Uint8Array.from(Buffer.from(srv.value.data))),
        signature: Array.from(Uint8Array.from(srv.signature)),
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
