import axios, { AxiosResponse } from "axios";
import { uploadFile, uploadDirectory, uploadDirectoryRequest, uploadFileRequest } from "./upload";
import { addSkykey, createSkykey, getSkykeyById, getSkykeyByName, getSkykeys } from "./encryption";
import {
  downloadFile,
  downloadFileHns,
  getSkylinkUrl,
  getHnsUrl,
  getHnsresUrl,
  getMetadata,
  openFile,
  openFileHns,
  resolveHns,
} from "./download";

import { addUrlQuery, defaultPortalUrl, makeUrl } from "./utils";
import { getFile, setFile } from "./skydb";
import { lookupRegistry, updateRegistry } from "./registry";

export type CustomClientOptions = {
  APIKey?: string; // authentication password to use
  customUserAgent?: string; // custom user agent header to set
  onUploadProgress?: (progress: number, event: ProgressEvent) => void; // optional callback to track upload progress
};

export class SkynetClient {
  portalUrl: string;
  customOptions: CustomClientOptions;

  constructor(portalUrl: string = defaultPortalUrl(), customOptions: CustomClientOptions = {}) {
    this.portalUrl = portalUrl;
    this.customOptions = customOptions;
  }

  uploadFile = uploadFile;
  uploadDirectory = uploadDirectory;
  uploadDirectoryRequest = uploadDirectoryRequest;
  uploadFileRequest = uploadFileRequest;

  addSkykey = addSkykey;
  createSkykey = createSkykey;
  getSkykeyById = getSkykeyById;
  getSkykeyByName = getSkykeyByName;
  getSkykeys = getSkykeys;

  downloadFile = downloadFile;
  downloadFileHns = downloadFileHns;
  getSkylinkUrl = getSkylinkUrl;
  getHnsUrl = getHnsUrl;
  getHnsresUrl = getHnsresUrl;
  getMetadata = getMetadata;
  openFile = openFile;
  openFileHns = openFileHns;
  resolveHns = resolveHns;

  // SkyDB
  getFile = getFile;
  setFile = setFile;

  // SkyDB helpers
  lookupRegistry = lookupRegistry;
  updateRegistry = updateRegistry;

  /**
   * Creates and executes a request.
   * @param {Object} config - Configuration for the request. See docs for constructor for the full list of options.
   */
  executeRequest(config: any): Promise<AxiosResponse> {
    let url = config.url;
    if (!url) {
      url = makeUrl(this.portalUrl, config.endpointPath, config.extraPath ?? "");
      url = addUrlQuery(url, config.query);
    }

    // No other headers.
    const headers = config.customUserAgent && { "User-Agent": config.customUserAgent };

    return axios({
      url,
      method: config.method,
      data: config.data,
      headers,
      auth: config.APIKey && { username: "", password: config.APIKey },
      onUploadProgress:
        config.onUploadProgress &&
        function (event: ProgressEvent) {
          const progress = event.loaded / event.total;

          config.onUploadProgress(progress, event);
        },
    });
  }
}
