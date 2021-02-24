/**
 * Node-only upload functions.
 */

import { AxiosResponse } from "axios";
import FormData from "form-data";
import fs from "fs";

import { SkynetClient } from "../client/node";
import { CustomUploadOptions, defaultUploadOptions, UploadRequestResponse } from "./index";
import { formatSkylink } from "../utils";

export async function uploadFileFromPath(
  this: SkynetClient,
  path: string,
  customOptions?: CustomUploadOptions
): Promise<UploadRequestResponse> {
  const response = await this.uploadFileFromPathRequest(path, customOptions);

  const skylink = formatSkylink(response.data.skylink);
  const merkleroot = response.data.merkleroot;
  const bitfield = response.data.bitfield;

  return { skylink, merkleroot, bitfield };
}

export async function uploadFileFromPathRequest(
  this: SkynetClient,
  path: string,
  customOptions?: CustomUploadOptions
): Promise<AxiosResponse> {
  const opts = { ...defaultUploadOptions, ...this.customOptions, ...customOptions };

  const formData = new FormData();
  const filename = opts.customFilename ? opts.customFilename : "";
  formData.append(opts.portalFileFieldname, fs.createReadStream(path), filename);

  return this.executeRequest({
    ...opts,
    method: "post",
    // @ts-ignore
    data: formData,
    headers: formData.getHeaders(),
  });
}
