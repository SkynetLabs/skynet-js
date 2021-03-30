import axios, { AxiosResponse } from "axios";
import type { Method } from "axios";
import { uploadFile, uploadDirectory, uploadDirectoryRequest, uploadFileRequest } from "./upload";
import {
  downloadFile,
  downloadFileHns,
  getSkylinkUrl,
  getHnsUrl,
  getHnsresUrl,
  getMetadata,
  getFileContent,
  getFileContentHns,
  getFileContentRequest,
  openFile,
  openFileHns,
  resolveHns,
} from "./download";
import { getJSON, setJSON } from "./skydb";
import { getEntry, getEntryUrl, setEntry } from "./registry";

import { addUrlQuery, defaultPortalUrl, makeUrl } from "./utils/url";

/**
 * Custom client options.
 *
 * @property [APIKey] - Authentication password to use.
 * @property [customUserAgent] - Custom user agent header to set.
 * @property [onUploadProgress] - Optional callback to track upload progress.
 */
export type CustomClientOptions = {
  APIKey?: string;
  customUserAgent?: string;
  onUploadProgress?: (progress: number, event: ProgressEvent) => void;
};

/**
 * Config options for a single request.
 *
 * @property [data] - The data for a POST request.
 * @property [url] - The full url to contact. Will be computed from the portalUrl and endpointPath if not provided.
 * @property [method] - The request method.
 * @property [query] - Query parameters.
 * @property [timeout] - Request timeout. May be deprecated.
 * @property [extraPath] - An additional path to append to the URL, e.g. a 46-character skylink.
 */
export type RequestConfig = CustomClientOptions & {
  endpointPath: string;
  data?: FormData | Record<string, unknown>;
  url?: string;
  method?: Method;
  query?: Record<string, unknown>;
  timeout?: number; // TODO: remove
  extraPath?: string;
  skykeyName?: string;
  skykeyId?: string;
  headers?: Record<string, unknown>;
  transformRequest?: (data: unknown) => string;
  transformResponse?: (data: string) => Record<string, unknown>;
};

/**
 * The Skynet Client which can be used to access Skynet.
 */
export class SkynetClient {
  // The value of the 'skynet-portal-api' header.
  portalUrl: Promise<string>;
  customOptions: CustomClientOptions;

  // Set methods (defined in other files).

  // Upload
  uploadFile = uploadFile;
  protected uploadFileRequest = uploadFileRequest;
  uploadDirectory = uploadDirectory;
  protected uploadDirectoryRequest = uploadDirectoryRequest;

  // Download
  downloadFile = downloadFile;
  downloadFileHns = downloadFileHns;
  getSkylinkUrl = getSkylinkUrl;
  getHnsUrl = getHnsUrl;
  getHnsresUrl = getHnsresUrl;
  getMetadata = getMetadata;
  getFileContent = getFileContent;
  getFileContentHns = getFileContentHns;
  protected getFileContentRequest = getFileContentRequest;
  openFile = openFile;
  openFileHns = openFileHns;
  resolveHns = resolveHns;

  // SkyDB
  db = {
    getJSON: getJSON.bind(this),
    setJSON: setJSON.bind(this),
  };

  // SkyDB helpers
  registry = {
    getEntry: getEntry.bind(this),
    getEntryUrl: getEntryUrl.bind(this),
    setEntry: setEntry.bind(this),
  };

  /**
   * The Skynet Client which can be used to access Skynet.
   *
   * @class
   * @param [initialPortalUrl] The initial portal URL to use to access Skynet, if specified. A request will be made to this URL to get the actual portal URL. To use the default portal while passing custom options, pass "".
   * @param [customOptions] Configuration for the client.
   */
  constructor(initialPortalUrl = "", customOptions: CustomClientOptions = {}) {
    // Get the initial portal URL, if not provided.
    if (initialPortalUrl == "") {
      initialPortalUrl = defaultPortalUrl();
    }
    // Kick off async request for the portal URL.
    this.portalUrl = this.executeRequest({
      ...customOptions,
      method: "head",
      url: initialPortalUrl,
      endpointPath: "/",
    }).then((response) => {
      /* istanbul ignore next */
      if (typeof response.headers === "undefined") {
        throw new Error(
          "Did not get 'headers' in response despite a successful request. Please try again and report this issue to the devs if it persists."
        );
      }
      const portalUrl = response.headers["skynet-portal-api"];
      if (!portalUrl) {
        throw new Error("Could not get portal URL for the given portal");
      }
      return portalUrl;
    });

    this.customOptions = customOptions;
  }

  /**
   * Creates and executes a request.
   *
   * @param config - Configuration for the request.
   * @returns - The response from axios.
   * @throws - Will throw if unimplemented options have been passed in.
   */
  protected async executeRequest(config: RequestConfig): Promise<AxiosResponse> {
    if (config.skykeyName || config.skykeyId) {
      throw new Error("Unimplemented: skykeys have not been implemented in this SDK");
    }

    // Build the URL.
    let url = config.url;
    if (!url) {
      const portalUrl = await this.portalUrl;
      url = makeUrl(portalUrl, config.endpointPath, config.extraPath ?? "");
    }
    if (config.query) {
      url = addUrlQuery(url, config.query);
    }

    // Build headers.
    const headers = { ...config.headers };
    if (config.customUserAgent) {
      headers["User-Agent"] = config.customUserAgent;
    }

    const auth = config.APIKey ? { username: "", password: config.APIKey } : undefined;

    /* istanbul ignore next */
    const onUploadProgress =
      config.onUploadProgress &&
      function (event: ProgressEvent) {
        const progress = event.loaded / event.total;

        // Need the if-statement or TS complains.
        if (config.onUploadProgress) config.onUploadProgress(progress, event);
      };

    return axios({
      url,
      method: config.method,
      data: config.data,
      headers,
      auth,
      onUploadProgress,
      transformRequest: config.transformRequest,
      transformResponse: config.transformResponse,

      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      // Allow cross-site cookies.
      withCredentials: true,
    });
  }
}
