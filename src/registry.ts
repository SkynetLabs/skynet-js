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

  const response = await this.executeRequest({
    ...opts,
    method: "get",
    query: {
      userid: user.id,
      fileid: Buffer.from(JSON.stringify(fileID)),
    },
  });

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
  return null;
}

export async function updateRegistry(user: User, fileID: FileID, srv: SignedRegistryValue, customOptions = {}) {
  const opts = {
    ...defaultRegistryOptions,
    ...customOptions,
    ...this.customOptions,
  };

  const formData = new FormData();
  formData.append("publickey", user.id);
  formData.append("fileid", JSON.stringify(fileID));
  formData.append("revision", srv.value.revision.toString());
  formData.append("data", srv.value.data);
  formData.append("signature", srv.signature);

  await this.executeRequest({
    ...opts,
    method: "post",
    data: formData,
  });
}
