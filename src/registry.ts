import { AxiosResponse } from "axios";
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
        userid: user.id,
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

export async function updateRegistry(user: User, fileID: FileID, srv: SignedRegistryValue, customOptions = {}) {
  const opts = {
    ...defaultRegistryOptions,
    ...customOptions,
    ...this.customOptions,
  };

  const formData = new FormData();
  formData.append("publickey", user.id);
  formData.append(
    "fileid",
    JSON.stringify({
      version: fileID.version,
      applicationid: fileID.applicationID,
      filetype: fileID.fileType,
      filename: fileID.filename,
    })
  );
  formData.append("revision", srv.value.revision.toString());
  formData.append("data", srv.value.data);
  formData.append("signature", srv.signature);

  await this.executeRequest({
    ...opts,
    method: "post",
    data: formData,
  });
}
