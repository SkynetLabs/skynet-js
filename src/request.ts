import { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";

import { SkynetClient } from "./client";
import { addUrlQuery, addUrlSubdomain, ensureUrlPrefix, makeUrl } from "./utils/url";

export type Headers = { [key: string]: string };

/**
 * Helper function that builds the request headers.
 *
 * @param [baseHeaders] - Any base headers.
 * @param [customUserAgent] - A custom user agent to set.
 * @param [customCookie] - A custom cookie.
 * @param [skynetApiKey] - Authentication key to use for a Skynet portal.
 * @returns - The built headers.
 */
export function buildRequestHeaders(
  baseHeaders?: Headers,
  customUserAgent?: string,
  customCookie?: string,
  skynetApiKey?: string
): Headers {
  const returnHeaders = { ...baseHeaders };
  // Set some headers from common options.
  if (customUserAgent) {
    returnHeaders["User-Agent"] = customUserAgent;
  }
  if (customCookie) {
    returnHeaders["Cookie"] = customCookie;
  }
  if (skynetApiKey) {
    returnHeaders["Skynet-Api-Key"] = skynetApiKey;
  }
  return returnHeaders;
}

/**
 * Helper function that builds the request URL. Ensures that the final URL
 * always has a protocol prefix for consistency.
 *
 * @param client - The Skynet client.
 * @param parts - The URL parts to use when constructing the URL.
 * @param [parts.baseUrl] - The base URL to use, instead of the portal URL.
 * @param [parts.endpointPath] - The endpoint to contact.
 * @param [parts.subdomain] - An optional subdomain to add to the URL.
 * @param [parts.extraPath] - An optional path to append to the URL.
 * @param [parts.query] - Optional query parameters to append to the URL.
 * @returns - The built URL.
 */
export async function buildRequestUrl(
  client: SkynetClient,
  parts: {
    baseUrl?: string;
    endpointPath?: string;
    subdomain?: string;
    extraPath?: string;
    query?: { [key: string]: string | undefined };
  }
): Promise<string> {
  let url;

  // Get the base URL, if not passed in.
  if (!parts.baseUrl) {
    url = await client.portalUrl();
  } else {
    url = parts.baseUrl;
  }

  // Make sure the URL has a protocol.
  url = ensureUrlPrefix(url);

  if (parts.endpointPath) {
    url = makeUrl(url, parts.endpointPath);
  }
  if (parts.extraPath) {
    url = makeUrl(url, parts.extraPath);
  }
  if (parts.subdomain) {
    url = addUrlSubdomain(url, parts.subdomain);
  }
  if (parts.query) {
    url = addUrlQuery(url, parts.query);
  }

  return url;
}

/**
 * The error type returned by the SDK whenever it makes a network request
 * (internally, this happens in `executeRequest`). It implements, so is
 * compatible with, `AxiosError`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class ExecuteRequestError<T = any, D = any> extends Error implements AxiosError {
  originalError: AxiosError;
  responseStatus: number | null;
  responseMessage: string | null;

  // Properties required by `AxiosError`.

  config: AxiosRequestConfig<D>;
  code?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  request?: any;
  response?: AxiosResponse<T, D>;
  isAxiosError: boolean;
  // eslint-disable-next-line @typescript-eslint/ban-types
  toJSON: () => object;

  /**
   * Creates an `ExecuteRequestError`.
   *
   * @param message - The error message.
   * @param axiosError - The original Axios error.
   * @param responseStatus - The response status, if found in the original error.
   * @param responseMessage - The response message, if found in the original error.
   */
  constructor(
    message: string,
    axiosError: AxiosError<T, D>,
    responseStatus: number | null,
    responseMessage: string | null
  ) {
    // Include this check since `ExecuteRequestError` implements `AxiosError`,
    // but we only expect original errors from Axios here. Anything else
    // indicates a likely developer/logic bug.
    if (axiosError instanceof ExecuteRequestError) {
      throw new Error(
        "Could not instantiate an `ExecuteRequestError` from an `ExecuteRequestError`, an original error from axios was expected"
      );
    }

    // Set `Error` fields.
    super(message);
    this.name = "ExecuteRequestError";

    // Set `ExecuteRequestError` fields.
    this.originalError = axiosError;
    this.responseStatus = responseStatus;
    this.responseMessage = responseMessage;

    // Set properties required by `AxiosError`.
    //
    // NOTE: `Object.assign` doesn't work because Typescript can't detect that
    // required fields are set in this constructor.
    this.config = axiosError.config;
    this.code = axiosError.code;
    this.request = axiosError.request;
    this.response = axiosError.response;
    this.isAxiosError = axiosError.isAxiosError;
    this.toJSON = axiosError.toJSON;

    // Required for `instanceof` to work.
    Object.setPrototypeOf(this, ExecuteRequestError.prototype);
  }

  /**
   * Gets the full, descriptive error response returned from skyd on the portal.
   *
   * @param err - The Axios error.
   * @returns - A new error if the error response is malformed, or the skyd error message otherwise.
   */
  static From(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    err: AxiosError<any, any>
  ): ExecuteRequestError {
    /* istanbul ignore next */
    if (!err.response) {
      return new ExecuteRequestError(`Error response did not contain expected field 'response'.`, err, null, null);
    }
    /* istanbul ignore next */
    if (!err.response.status) {
      return new ExecuteRequestError(
        `Error response did not contain expected field 'response.status'.`,
        err,
        null,
        null
      );
    }

    const status = err.response.status;

    // If we don't get an error message from skyd, just return the status code.
    /* istanbul ignore next */
    if (!err.response.data) {
      return new ExecuteRequestError(`Request failed with status code ${status}`, err, status, null);
    }
    /* istanbul ignore next */
    if (!err.response.data.message) {
      return new ExecuteRequestError(`Request failed with status code ${status}`, err, status, null);
    }

    // Return the error message from skyd. Pass along the original Axios error.
    return new ExecuteRequestError(
      `Request failed with status code ${err.response.status}: ${err.response.data.message}.`,
      err,
      status,
      err.response.data.message
    );
  }
}
