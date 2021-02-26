import { SkynetClient } from "../client";
import {
  CustomDownloadOptions,
  defaultDownloadOptions,
  defaultDownloadHnsOptions,
  CustomHnsDownloadOptions,
} from "./index";

/**
 * Initiates a download of the content of the skylink within the browser.
 *
 * @param this - SkynetClient
 * @param skylinkUrl - 46-character skylink, or a valid skylink URL. Can be followed by a path. Note that the skylink will not be encoded, so if your path might contain special characters, consider using `customOptions.path`.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @param [customOptions.endpointPath="/"] - The relative URL path of the portal endpoint to contact.
 * @returns - The full URL that was used.
 * @throws - Will throw if the skylinkUrl does not contain a skylink or if the path option is not a string.
 */
export function downloadFile(this: SkynetClient, skylinkUrl: string, customOptions?: CustomDownloadOptions): string {
  /* istanbul ignore next */
  if (typeof skylinkUrl !== "string") {
    throw new Error(`Expected parameter skylinkUrl to be type string, was type ${typeof skylinkUrl}`);
  }

  const opts = { ...defaultDownloadOptions, ...this.customOptions, ...customOptions, download: true };
  const url = this.getSkylinkUrl(skylinkUrl, opts);

  // Download the url.
  window.location.assign(url);

  return url;
}

/**
 * Initiates a download of the content of the skylink at the Handshake domain.
 *
 * @param this - SkynetClient
 * @param domain - Handshake domain.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @param [customOptions.endpointPath="/hns"] - The relative URL path of the portal endpoint to contact.
 * @returns - The full URL that was used.
 * @throws - Will throw if the input domain is not a string.
 */
export async function downloadFileHns(
  this: SkynetClient,
  domain: string,
  customOptions?: CustomDownloadOptions
): Promise<string> {
  /* istanbul ignore next */
  if (typeof domain !== "string") {
    throw new Error(`Expected parameter domain to be type string, was type ${typeof domain}`);
  }

  const opts = { ...defaultDownloadHnsOptions, ...this.customOptions, ...customOptions, download: true };
  const url = this.getHnsUrl(domain, opts);

  // Download the url.
  window.location.assign(url);

  return url;
}

/**
 * Opens the content of the skylink within the browser.
 *
 * @param this - SkynetClient
 * @param skylinkUrl - Skylink string. See `downloadFile`.
 * @param [customOptions] - Additional settings that can optionally be set. See `downloadFile` for the full list.
 * @param [customOptions.endpointPath="/"] - The relative URL path of the portal endpoint to contact.
 * @returns - The full URL that was used.
 * @throws - Will throw if the skylinkUrl does not contain a skylink or if the path option is not a string.
 */
export function openFile(this: SkynetClient, skylinkUrl: string, customOptions?: CustomDownloadOptions): string {
  /* istanbul ignore next */
  if (typeof skylinkUrl !== "string") {
    throw new Error(`Expected parameter skylinkUrl to be type string, was type ${typeof skylinkUrl}`);
  }

  const opts = { ...defaultDownloadOptions, ...this.customOptions, ...customOptions };
  const url = this.getSkylinkUrl(skylinkUrl, opts);

  window.open(url, "_blank");

  return url;
}

/**
 * Opens the content of the skylink from the given Handshake domain within the browser.
 *
 * @param this - SkynetClient
 * @param domain - Handshake domain.
 * @param [customOptions] - Additional settings that can optionally be set. See `downloadFileHns` for the full list.
 * @param [customOptions.endpointPath="/hns"] - The relative URL path of the portal endpoint to contact.
 * @returns - The full URL that was used.
 * @throws - Will throw if the input domain is not a string.
 */
export async function openFileHns(
  this: SkynetClient,
  domain: string,
  customOptions?: CustomHnsDownloadOptions
): Promise<string> {
  /* istanbul ignore next */
  if (typeof domain !== "string") {
    throw new Error(`Expected parameter domain to be type string, was type ${typeof domain}`);
  }

  const opts = { ...defaultDownloadHnsOptions, ...this.customOptions, ...customOptions };
  const url = this.getHnsUrl(domain, opts);

  // Open the url in a new tab.
  window.open(url, "_blank");

  return url;
}
