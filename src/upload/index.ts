import { AxiosResponse } from "axios";

import { SkynetClient } from "../client/index";
import { defaultOptions, BaseCustomOptions, formatSkylink } from "../utils";

/**
 * Custom upload options.
 *
 * @property [portalFileFieldname="file"] - The file fieldname for uploading files on this portal.
 * @property [portalDirectoryfilefieldname="files[]"] - The file fieldname for uploading directories on this portal.
 * @property [customFilename] - The custom filename to use when uploading files.
 * @property [query] - Query parameters.
 */
export type CustomUploadOptions = BaseCustomOptions & {
  portalFileFieldname?: string;
  portalDirectoryFileFieldname?: string;
  customFilename?: string;
  query?: Record<string, unknown>;
};

/**
 * The response to an upload request.
 *
 * @property skylink - 46-character skylink.
 * @property merkleroot - The hash that is encoded into the skylink.
 * @property bitfield - The bitfield that gets encoded into the skylink. The bitfield contains a version, an offset and a length in a heavily compressed and optimized format.
 */
export type UploadRequestResponse = {
  skylink: string;
  merkleroot: string;
  bitfield: number;
};

export const defaultUploadOptions = {
  ...defaultOptions("/skynet/skyfile"),
  portalFileFieldname: "file",
  portalDirectoryFileFieldname: "files[]",
  customFilename: "",
};

export async function uploadFileContent(
  this: SkynetClient,
  fileContents: string,
  fileName: string,
  customOptions?: CustomUploadOptions
): Promise<UploadRequestResponse> {
  const response = await this.uploadFileContentRequest(fileContents, fileName, customOptions);

  /* istanbul ignore next */
  if (
    typeof response.data.skylink !== "string" ||
    typeof response.data.merkleroot !== "string" ||
    typeof response.data.bitfield !== "number"
  ) {
    throw new Error(
      "Did not get a complete upload response despite a successful request. Please try again and report this issue to the devs if it persists."
    );
  }

  const skylink = formatSkylink(response.data.skylink);
  const merkleroot = response.data.merkleroot;
  const bitfield = response.data.bitfield;

  return { skylink, merkleroot, bitfield };
}

export async function uploadFileContentRequest(
  this: SkynetClient,
  fileContents: string,
  fileName: string,
  customOptions?: CustomUploadOptions
): Promise<AxiosResponse> {
  const opts = { ...defaultUploadOptions, ...this.customOptions, ...customOptions };

  const formData = new FormData();
  formData.append(opts.portalFileFieldname, new Blob([fileContents]), fileName);

  return this.executeRequest({
    ...opts,
    method: "post",
    data: formData,
  });
}
