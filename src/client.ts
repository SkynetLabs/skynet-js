import axios, { AxiosError } from "axios";
import type { AxiosResponse, ResponseType, Method } from "axios";

import {
  uploadFile,
  uploadLargeFile,
  uploadDirectory,
  uploadDirectoryRequest,
  uploadSmallFile,
  uploadSmallFileRequest,
  uploadLargeFileRequest,
} from "./upload";
import {
  downloadFile,
  downloadFileHns,
  getSkylinkUrl,
  getHnsUrl,
  getHnsresUrl,
  getMetadata,
  getFileContent,
  getFileContentRequest,
  getFileContentHns,
  openFile,
  openFileHns,
  resolveHns,
} from "./download";
import {
  getJSONEncrypted,
  getEntryData as fileGetEntryData,
  getEntryLink as fileGetEntryLink,
  getJSON as fileGetJSON,
} from "./file";
import { pinSkylink } from "./pin";
import { getEntry, getEntryLinkAsync, getEntryUrl, setEntry, postSignedEntry } from "./registry";
import { RevisionNumberCache } from "./revision_cache";
import {
  deleteJSON,
  getJSON,
  setJSON,
  setDataLink,
  getRawBytes,
  getEntryData,
  setEntryData,
  deleteEntryData,
} from "./skydb";
import { defaultPortalUrl } from "./utils/url";
import { loadMySky } from "./mysky";
import { extractDomain, getFullDomainUrl } from "./mysky/utils";
import { buildRequestHeaders, buildRequestUrl, ExecuteRequestError, Headers } from "./request";

/**
 * Custom client options.
 *
 * @property [APIKey] - Authentication password to use.
 * @property [customUserAgent] - Custom user agent header to set.
 * @property [customCookie] - Custom cookie header to set.
 * @property [onDownloadProgress] - Optional callback to track download progress.
 * @property [onUploadProgress] - Optional callback to track upload progress.
 * @property [loginFn] - A function that, if set, is called when a 401 is returned from the request before re-trying the request.
 */
export type CustomClientOptions = {
  APIKey?: string;
  customUserAgent?: string;
  customCookie?: string;
  onDownloadProgress?: (progress: number, event: ProgressEvent) => void;
  onUploadProgress?: (progress: number, event: ProgressEvent) => void;
  loginFn?: () => Promise<void>;
};

/**
 * Config options for a single request.
 *
 * @property endpointPath - The endpoint to contact.
 * @property [data] - The data for a POST request.
 * @property [url] - The full url to contact. Will be computed from the portalUrl and endpointPath if not provided.
 * @property [method] - The request method.
 * @property [headers] - Any request headers to set.
 * @property [subdomain] - An optional subdomain to add to the URL.
 * @property [query] - Query parameters.
 * @property [extraPath] - An additional path to append to the URL, e.g. a 46-character skylink.
 * @property [responseType] - The response type.
 * @property [transformRequest] - A function that allows manually transforming the request.
 * @property [transformResponse] - A function that allows manually transforming the response.
 */
export type RequestConfig = CustomClientOptions & {
  endpointPath?: string;
  data?: FormData | Record<string, unknown>;
  url?: string;
  method?: Method;
  headers?: Headers;
  subdomain?: string;
  query?: { [key: string]: string | undefined };
  extraPath?: string;
  responseType?: ResponseType;
  transformRequest?: (data: unknown) => string;
  transformResponse?: (data: string) => Record<string, unknown>;
};

// Add a response interceptor so that we always return an error of type
// `ExecuteResponseError`.
axios.interceptors.response.use(
  function (response) {
    // Any status code that lie within the range of 2xx cause this function to trigger.
    // Do something with response data.
    return response;
  },
  function (error) {
    // Any status codes that falls outside the range of 2xx cause this function to trigger
    // Do something with response error.
    return Promise.reject(ExecuteRequestError.From(error as AxiosError));
  }
);

/**
 * The Skynet Client which can be used to access Skynet.
 */
export class SkynetClient {
  customOptions: CustomClientOptions;

  // The initial portal URL, the value of `defaultPortalUrl()` if `new
  // SkynetClient` is called without a given portal. This initial URL is used to
  // resolve the final portal URL.
  protected initialPortalUrl: string;
  // The resolved API portal URL. The request won't be made until needed, or
  // `initPortalUrl()` is called. The request is only made once, for all Skynet
  // Clients.
  protected static resolvedPortalUrl?: Promise<string>;
  // The custom portal URL, if one was passed in to `new SkynetClient()`.
  protected customPortalUrl?: string;

  // Set methods (defined in other files).

  // Upload

  uploadFile = uploadFile;
  protected uploadSmallFile = uploadSmallFile;
  protected uploadSmallFileRequest = uploadSmallFileRequest;
  protected uploadLargeFile = uploadLargeFile;
  protected uploadLargeFileRequest = uploadLargeFileRequest;
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
  protected getFileContentRequest = getFileContentRequest;
  getFileContentHns = getFileContentHns;
  openFile = openFile;
  openFileHns = openFileHns;
  resolveHns = resolveHns;

  // Pin

  pinSkylink = pinSkylink;

  // MySky

  extractDomain = extractDomain;
  getFullDomainUrl = getFullDomainUrl;
  loadMySky = loadMySky;

  // File API

  file = {
    getJSON: fileGetJSON.bind(this),
    getEntryData: fileGetEntryData.bind(this),
    getEntryLink: fileGetEntryLink.bind(this),
    getJSONEncrypted: getJSONEncrypted.bind(this),
  };

  // SkyDB

  db = {
    deleteJSON: deleteJSON.bind(this),
    getJSON: getJSON.bind(this),
    setJSON: setJSON.bind(this),
    getRawBytes: getRawBytes.bind(this),
    setDataLink: setDataLink.bind(this),
    getEntryData: getEntryData.bind(this),
    setEntryData: setEntryData.bind(this),
    deleteEntryData: deleteEntryData.bind(this),

    // Holds the cached revision numbers, protected by mutexes to prevent
    // concurrent access.
    revisionNumberCache: new RevisionNumberCache(),
  };

  // Registry

  registry = {
    getEntry: getEntry.bind(this),
    getEntryUrl: getEntryUrl.bind(this),
    getEntryLink: getEntryLinkAsync.bind(this),
    setEntry: setEntry.bind(this),
    postSignedEntry: postSignedEntry.bind(this),
  };

  /**
   * The Skynet Client which can be used to access Skynet.
   *
   * @class
   * @param [initialPortalUrl] The initial portal URL to use to access Skynet, if specified. A request will be made to this URL to get the actual portal URL. To use the default portal while passing custom options, pass "".
   * @param [customOptions] Configuration for the client.
   */
  constructor(initialPortalUrl = "", customOptions: CustomClientOptions = {}) {
    if (initialPortalUrl === "") {
      // Portal was not given, use the default portal URL. We'll still make a request for the resolved portal URL.
      initialPortalUrl = defaultPortalUrl();
    } else {
      // Portal was given, don't make the request for the resolved portal URL.
      this.customPortalUrl = initialPortalUrl;
    }
    this.initialPortalUrl = initialPortalUrl;
    this.customOptions = customOptions;
  }

  /* istanbul ignore next */
  /**
   * Make the request for the API portal URL.
   *
   * @returns - A promise that resolves when the request is complete.
   */
  async initPortalUrl(): Promise<void> {
    if (this.customPortalUrl) {
      // Tried to make a request for the API portal URL when a custom URL was already provided.
      return;
    }

    // Try to resolve the portal URL again if it's never been called or if it
    // previously failed.
    if (!SkynetClient.resolvedPortalUrl) {
      SkynetClient.resolvedPortalUrl = this.resolvePortalUrl();
    } else {
      try {
        await SkynetClient.resolvedPortalUrl;
      } catch (e) {
        SkynetClient.resolvedPortalUrl = this.resolvePortalUrl();
      }
    }

    // Wait on the promise and throw if it fails.
    await SkynetClient.resolvedPortalUrl;
    return;
  }

  /* istanbul ignore next */
  /**
   * Returns the API portal URL. Makes the request to get it if not done so already.
   *
   * @returns - the portal URL.
   */
  async portalUrl(): Promise<string> {
    if (this.customPortalUrl) {
      return this.customPortalUrl;
    }

    // Make the request if needed and not done so.
    await this.initPortalUrl();

    return await SkynetClient.resolvedPortalUrl!; // eslint-disable-line
  }

  /**
   * Creates and executes a request.
   *
   * @param config - Configuration for the request.
   * @returns - The response from axios.
   * @throws - Will throw `ExecuteRequestError` if the request fails. This error contains the original Axios error.
   */
  async executeRequest(config: RequestConfig): Promise<AxiosResponse> {
    const url = await buildRequestUrl(this, {
      baseUrl: config.url,
      endpointPath: config.endpointPath,
      subdomain: config.subdomain,
      extraPath: config.extraPath,
      query: config.query,
    });

    // Build headers.
    const headers = buildRequestHeaders(config.headers, config.customUserAgent, config.customCookie);

    const auth = config.APIKey ? { username: "", password: config.APIKey } : undefined;

    let onDownloadProgress = undefined;
    if (config.onDownloadProgress) {
      onDownloadProgress = function (event: ProgressEvent) {
        // Avoid NaN for 0-byte file.
        /* istanbul ignore next: Empty file test doesn't work yet. */
        const progress = event.total ? event.loaded / event.total : 1;
        // @ts-expect-error TS complains even though we've ensured this is defined.
        config.onDownloadProgress(progress, event);
      };
    }
    let onUploadProgress = undefined;
    if (config.onUploadProgress) {
      onUploadProgress = function (event: ProgressEvent) {
        // Avoid NaN for 0-byte file.
        /* istanbul ignore next: event.total is always 0 in Node. */
        const progress = event.total ? event.loaded / event.total : 1;
        // @ts-expect-error TS complains even though we've ensured this is defined.
        config.onUploadProgress(progress, event);
      };
    }

    // NOTE: The error type will be `ExecuteRequestError` as we set up a
    // response interceptor above.
    try {
      return await axios({
        url,
        method: config.method,
        data: config.data,
        headers,
        auth,
        onDownloadProgress,
        onUploadProgress,
        responseType: config.responseType,
        transformRequest: config.transformRequest,
        transformResponse: config.transformResponse,

        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        // Allow cross-site cookies.
        withCredentials: true,
      });
    } catch (e) {
      if (config.loginFn && (e as ExecuteRequestError).responseStatus === 401) {
        // Try logging in again.
        await config.loginFn();
        return await this.executeRequest(config);
      } else {
        throw e;
      }
    }
  }

  // ===============
  // Private Methods
  // ===============

  /**
   * Gets the current server URL for the portal. You should generally use
   * `portalUrl` instead - this method can be used for detecting whether the
   * current URL is a server URL.
   *
   * @returns - The portal server URL.
   */
  protected async resolvePortalServerUrl(): Promise<string> {
    const response = await this.executeRequest({
      ...this.customOptions,
      method: "head",
      url: this.initialPortalUrl,
      endpointPath: "/",
    });

    if (!response.headers) {
      throw new Error(
        "Did not get 'headers' in response despite a successful request. Please try again and report this issue to the devs if it persists."
      );
    }
    const portalUrl = response.headers["skynet-server-api"];
    if (!portalUrl) {
      throw new Error("Could not get portal URL for the given portal");
    }
    return portalUrl;
  }

  /**
   * Make a request to resolve the provided `initialPortalUrl`.
   *
   * @returns - The portal URL.
   */
  protected async resolvePortalUrl(): Promise<string> {
    const response = await this.executeRequest({
      ...this.customOptions,
      method: "head",
      url: this.initialPortalUrl,
      endpointPath: "/",
    });

    if (!response.headers) {
      throw new Error(
        "Did not get 'headers' in response despite a successful request. Please try again and report this issue to the devs if it persists."
      );
    }
    const portalUrl = response.headers["skynet-portal-api"];
    if (!portalUrl) {
      throw new Error("Could not get portal URL for the given portal");
    }
    return portalUrl;
  }
}
