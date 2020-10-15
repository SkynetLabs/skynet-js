import { AxiosResponse } from "axios";
import { encodeNumber, EncodeUserPublicKey } from "./crypto";
import { FileID, User } from "./skydb";
import { defaultOptions } from "./utils";

const defaultRegistryOptions = {
  ...defaultOptions("/skynet/registry"),
};

export type RegistryValue = {
  tweak: string;
  data: string;
  revision: number;
};

export type SignedRegistryValue = {
  value: RegistryValue;
  signature: string;
};

export async function lookupRegistry(
  user: User,
  fileID: FileID,
  customOptions = {}
): Promise<SignedRegistryValue | null> {
  const opts = {
    ...defaultRegistryOptions,
    ...customOptions,
    ...this.customOptions,
  };

  let response: AxiosResponse;
  try {
    response = await this.executeRequest({
      ...opts,
      method: "get",
      query: {
        publickey: Buffer.from(EncodeUserPublicKey(user)),
        fileid: Buffer.from(
          JSON.stringify({
            version: fileID.version,
            applicationid: fileID.applicationID,
            filetype: fileID.fileType,
            filename: fileID.filename,
          })
        ),
      },
    });
  } catch (err: unknown) {
    console.log("LOOKUP ERR", err);
    // unfortunately axios rejects anything that's not >= 200 and < 300
    return null;
  }

  if (response.status === 200) {
    return {
      value: {
        tweak: response.data.Tweak,
        data: response.data.Data,
        revision: parseInt(response.data.Revision, 10),
      },
      signature: response.data.Signature,
    };
  }
  throw new Error(`unexpected response status code ${response.status}`);
}

export async function updateRegistry(
  user: User,
  fileID: FileID,
  srv: SignedRegistryValue,
  customOptions = {}
): Promise<boolean> {
  const opts = {
    ...defaultRegistryOptions,
    ...customOptions,
    ...this.customOptions,
  };

  let response: AxiosResponse;
  try {
    response = await this.executeRequest({
      ...opts,
      method: "post",
      data: {
        publickey: Buffer.from(EncodeUserPublicKey(user)),
        fileid: Buffer.from(
          JSON.stringify({
            version: fileID.version,
            applicationid: fileID.applicationID,
            filetype: fileID.fileType,
            filename: fileID.filename,
          })
        ),
        revision: srv.value.revision,
        data: Buffer.from(srv.value.data),
        signature: Buffer.from(srv.signature),
      },
    });
  } catch (err: unknown) {
    console.log("UPDATE ERR", err);
    // unfortunately axios rejects anything that's not >= 200 and < 300
    return false;
  }

  if (response.status === 204) {
    return true;
  }
  throw new Error(`unexpected response status code ${response.status}`);
}
