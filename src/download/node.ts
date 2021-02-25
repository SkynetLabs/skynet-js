import fs from "fs";

import { SkynetClient } from "../client/index";
import { formatSkylink } from "../utils";
import {
  CustomDownloadOptions,
  defaultDownloadOptions,
  defaultDownloadHnsOptions,
  CustomHnsDownloadOptions,
  GetMetadataResponse,
} from "./index";

export async function downloadFileToPath(
  this: SkynetClient,
  skylinkUrl: string,
  path: string,
  customOptions?: CustomDownloadOptions
): Promise<GetMetadataResponse> {
  const opts = { ...defaultDownloadOptions, ...this.customOptions, ...customOptions };

  const url = this.getSkylinkUrl(skylinkUrl, opts);

  const writer = fs.createWriteStream(path);

  const response = await this.executeRequest({
    ...opts,
    method: "get",
    url,
  });

  /* istanbul ignore next */
  if (typeof response.data === "undefined") {
    throw new Error(
      "Did not get 'data' in response despite a successful request. Please try again and report this issue to the devs if it persists."
    );
  }
  /* istanbul ignore next */
  if (typeof response.headers === "undefined") {
    throw new Error(
      "Did not get 'headers' in response despite a successful request. Please try again and report this issue to the devs if it persists."
    );
  }

  response.data.pipe(writer);

  const contentType = response.headers["content-type"] ?? "";
  const metadata = response.headers["skynet-file-metadata"] ? JSON.parse(response.headers["skynet-file-metadata"]) : {};
  const skylink = response.headers["skynet-skylink"] ? formatSkylink(response.headers["skynet-skylink"]) : "";

  return { contentType, metadata, skylink };
}

export async function downloadFileHnsToPath(
  this: SkynetClient,
  domain: string,
  path: string,
  customOptions?: CustomHnsDownloadOptions
): Promise<GetMetadataResponse> {
  const opts = { ...defaultDownloadHnsOptions, ...this.customOptions, ...customOptions };

  const url = this.getHnsUrl(domain, opts);

  const writer = fs.createWriteStream(path);

  const response = await this.executeRequest({
    ...opts,
    method: "get",
    url,
  });

  /* istanbul ignore next */
  if (typeof response.data === "undefined") {
    throw new Error(
      "Did not get 'data' in response despite a successful request. Please try again and report this issue to the devs if it persists."
    );
  }
  /* istanbul ignore next */
  if (typeof response.headers === "undefined") {
    throw new Error(
      "Did not get 'headers' in response despite a successful request. Please try again and report this issue to the devs if it persists."
    );
  }

  response.data.pipe(writer);

  const contentType = response.headers["content-type"] ?? "";
  const metadata = response.headers["skynet-file-metadata"] ? JSON.parse(response.headers["skynet-file-metadata"]) : {};
  const skylink = response.headers["skynet-skylink"] ? formatSkylink(response.headers["skynet-skylink"]) : "";

  return { contentType, metadata, skylink };
}
