import axios, { AxiosResponse, ResponseType } from "axios";
import type { Method } from "axios";

import {
  getSkylinkUrl,
  getHnsUrl,
  getHnsresUrl,
  getMetadata,
  getFileContent,
  getFileContentHns,
  getFileContentRequest,
  resolveHns,
} from "../download";
import { getJSON, setJSON } from "../skydb";
import { getEntry, getEntryUrl, getSkynsUrl, setEntry } from "../registry";

import { addUrlQuery, defaultPortalUrl, makeUrl } from "../utils/url";
import { CustomUploadOptions, UploadRequestResponse } from "../upload";

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
  responseType?: ResponseType;
  transformRequest?: (data: unknown) => string;
  transformResponse?: (data: string) => Record<string, unknown>;
};

/**
 * The base Skynet Client which can be used to access Skynet.
 */
export abstract class SkynetClient {
  // TODO: This is currently the url of the skapp and not the portal. It should be the value of 'skynet-portal-api' header. This will be a promise, which will be a breaking change.
  portalUrl: string;
  customOptions: CustomClientOptions;

  // Set methods (defined in other files).

  // Download
  getSkylinkUrl = getSkylinkUrl;
  getHnsUrl = getHnsUrl;
  getHnsresUrl = getHnsresUrl;
  getMetadata = getMetadata;
  getFileContent = getFileContent;
  getFileContentHns = getFileContentHns;
  protected getFileContentRequest = getFileContentRequest;
  resolveHns = resolveHns;

  // Upload
  abstract uploadFileContent(
    this: SkynetClient,
    fileContents: string,
    fileName: string,
    customOptions?: CustomUploadOptions
  ): Promise<UploadRequestResponse>;
  protected abstract uploadFileContentRequest(
    this: SkynetClient,
    fileContents: string,
    fileName: string,
    customOptions?: CustomUploadOptions
  ): Promise<AxiosResponse>;

  // SkyDB
  db = {
    getJSON: getJSON.bind(this),
    setJSON: setJSON.bind(this),
  };

  // SkyDB helpers
  registry = {
    getEntry: getEntry.bind(this),
    getEntryUrl: getEntryUrl.bind(this),
    getSkynsUrl: getSkynsUrl.bind(this),
    setEntry: setEntry.bind(this),
  };

  /**
   * The Skynet Client which can be used to access Skynet.
   *
   * @class
   * @param [portalUrl] The portal URL to use to access Skynet, if specified. To use the default portal while passing custom options, use ""
   * @param [customOptions] Configuration for the client.
   */
  constructor(portalUrl: string = defaultPortalUrl(), customOptions: CustomClientOptions = {}) {
    if (!portalUrl) {
      portalUrl = defaultPortalUrl();
    }
    this.portalUrl = portalUrl;
    this.customOptions = customOptions;
  }

  /**
   * Creates and executes a request.
   *
   * @param config - Configuration for the request.
   * @returns - The response from axios.
   * @throws - Will throw if unimplemented options have been passed in.
   */
  protected executeRequest(config: RequestConfig): Promise<AxiosResponse> {
    if (config.skykeyName || config.skykeyId) {
      throw new Error("Unimplemented: skykeys have not been implemented in this SDK");
    }

    // Build the URL.
    let url = config.url;
    if (!url) {
      url = makeUrl(this.portalUrl, config.endpointPath, config.extraPath ?? "");
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
      responseType: config.responseType,
      transformRequest: config.transformRequest,
      transformResponse: config.transformResponse,

      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
  }
}
