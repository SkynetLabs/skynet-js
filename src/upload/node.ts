/**
 * Node-only upload functions.
 */

import { AxiosResponse } from "axios";
import FormData from "form-data";
import fs from "fs";
import p from "path";

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

export async function uploadDirectoryFromPath(
  this: SkynetClient,
  path: string,
  customOptions = {}
): Promise<UploadRequestResponse> {
  const response = await this.uploadDirectoryFromPathRequest(path, customOptions);

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

export async function uploadDirectoryFromPathRequest(
  this: SkynetClient,
  path: string,
  customOptions = {}
): Promise<AxiosResponse> {
  const opts = { ...defaultUploadOptions, ...this.customOptions, ...customOptions };

  // Check if there is a directory at given path.
  const stat = fs.statSync(path);
  if (!stat.isDirectory()) {
    throw new Error(`Given path is not a directory: ${path}`);
  }

  const formData = new FormData();
  path = p.normalize(path);
  let basepath = path;
  // Ensure the basepath ends in a slash.
  if (!basepath.endsWith("/")) {
    basepath += "/";
    // Normalize the slash on non-Unix filesystems.
    basepath = p.normalize(basepath);
  }

  for (const file of walkDirectory(path)) {
    // Remove the dir path from the start of the filename if it exists.
    let filename = file;
    if (file.startsWith(basepath)) {
      filename = file.replace(basepath, "");
    }
    formData.append(opts.portalDirectoryFileFieldname, fs.createReadStream(file), { filepath: filename });
  }

  // TODO: Implement customDirname
  // let filename = opts.customDirname || path;
  let filename = path;
  /* istanbul ignore next */
  if (filename.startsWith("/")) {
    filename = filename.slice(1);
  }

  return this.executeRequest({
    ...opts,
    method: "post",
    // @ts-ignore
    data: formData,
    headers: formData.getHeaders(),
    query: { filename },
  });
}

function walkDirectory(filepath: string): Array<string> {
  /* istanbul ignore next */
  if (!fs.existsSync(filepath)) {
    return [];
  }

  let files: Array<string> = [];
  for (const subpath of fs.readdirSync(filepath)) {
    const fullpath = p.join(filepath, subpath);
    if (fs.statSync(fullpath).isDirectory()) {
      files = files.concat(walkDirectory(fullpath));
      continue;
    }
    files.push(fullpath);
  }
  return files;
}
