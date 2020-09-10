/* eslint-disable no-unused-vars */

import axios from "axios";

import { SkynetClient } from "./client.js";
import {
  addUrlQuery,
  defaultOptions,
  makeUrl,
  parseSkylink,
  trimUriPrefix,
  uriHandshakePrefix,
  uriHandshakeResolverPrefix,
} from "./utils.js";

const defaultDownloadOptions = {
  ...defaultOptions("/"),
};
const defaultDownloadHnsOptions = {
  ...defaultOptions("/hns"),
};
const defaultResolveHnsOptions = {
  ...defaultOptions("/hnsres"),
};

/**
 * Initiates a download of the content of the skylink within the browser.
 * @param {string} skylink - 46 character skylink.
 * @param {Object} [customOptions={}] - Additional settings that can optionally be set.
 * @param {string} [customOptions.endpointPath="/"] - The relative URL path of the portal endpoint to contact.
 * @param {string} [customOptions.path] - An array of path elements to append to the skylink. Each element will be URI-encoded (e.g. "?" -> "%3F") so make sure it is not already encoded. The encoded path elements are joined to form the full path, e.g. `dir1/dir2/file`.
 * @returns {string} - The full URL that was used.
 */
SkynetClient.prototype.downloadFile = function (skylink, customOptions = {}) {
  const opts = { ...defaultDownloadOptions, ...this.customOptions, ...customOptions, download: true };
  const url = this.getSkylinkUrl(skylink, opts);

  // Download the url.
  window.location = url;

  return url;
};

/**
 * Initiates a download of the content of the skylink at the Handshake domain.
 * @param {string} domain - Handshake domain.
 * @param {Object} [customOptions={}] - Additional settings that can optionally be set.
 * @param {string} [customOptions.endpointPath="/hns"] - The relative URL path of the portal endpoint to contact.
 * @returns {string} - The full URL that was used.
 */
SkynetClient.prototype.downloadFileHns = function (domain, customOptions = {}) {
  const opts = { ...defaultDownloadHnsOptions, ...this.customOptions, ...customOptions, download: true };
  const url = this.getHnsUrl(domain, opts);

  // Download the url.
  window.location = url;

  return url;
};

SkynetClient.prototype.getSkylinkUrl = function (skylink, customOptions = {}) {
  const opts = { ...defaultDownloadOptions, ...this.customOptions, ...customOptions };
  const query = opts.download ? { attachment: true } : {};

  let path = "";
  if (opts.path) {
    if (!Array.isArray(opts.path)) {
      throw new Error(`opts.path has to be an array, ${typeof opts.path} provided`);
    }
    // Encode each element of the path separately and join them.
    path = opts.path.map((element) => encodeURIComponent(element)).join("/");
  }

  const url = makeUrl(this.portalUrl, opts.endpointPath, parseSkylink(skylink), path);
  return addUrlQuery(url, query);
};

SkynetClient.prototype.getHnsUrl = function (domain, customOptions = {}) {
  const opts = { ...defaultDownloadHnsOptions, ...this.customOptions, ...customOptions };
  const query = opts.download ? { attachment: true } : {};

  const url = makeUrl(this.portalUrl, opts.endpointPath, trimUriPrefix(domain, uriHandshakePrefix));
  return addUrlQuery(url, query);
};

SkynetClient.prototype.getHnsresUrl = function (domain, customOptions = {}) {
  const opts = { ...defaultResolveHnsOptions, ...this.customOptions, ...customOptions };
  const query = opts.download ? { attachment: true } : {};

  return makeUrl(this.portalUrl, opts.endpointPath, trimUriPrefix(domain, uriHandshakeResolverPrefix));
};

SkynetClient.prototype.getMetadata = async function (skylink, customOptions = {}) {
  const opts = { ...defaultDownloadOptions, ...this.customOptions, ...customOptions };

  throw new Error("Unimplemented");
};

/**
 * Opens the content of the skylink within the browser.
 * @param {string} skylink - 46 character skylink.
 * @param {Object} [customOptions={}] - Additional settings that can optionally be set. See `downloadFile` for the full list.
 * @returns {string} - The full URL that was used.
 */
SkynetClient.prototype.openFile = function (skylink, customOptions = {}) {
  const opts = { ...defaultDownloadOptions, ...this.customOptions, ...customOptions };
  const url = this.getSkylinkUrl(skylink, opts);

  window.open(url, "_blank");

  return url;
};

/**
 * Opens the content of the skylink from the given Handshake domain within the browser.
 * @param {string} domain - Handshake domain.
 * @param {Object} [customOptions={}] - Additional settings that can optionally be set. See `downloadFileHns` for the full list.
 * @returns {string} - The full URL that was used.
 */
SkynetClient.prototype.openFileHns = function (domain, customOptions = {}) {
  const opts = { ...defaultDownloadHnsOptions, ...this.customOptions, ...customOptions };
  const url = this.getHnsUrl(domain, opts);

  // Open the url in a new tab.
  window.open(url, "_blank");

  return url;
};

/**
 * @param {string} domain - Handshake resolver domain.
 * @param {Object} [customOptions={}] - Additional settings that can optionally be set.
 * @param {string} [customOptions.endpointPath="/hnsres"] - The relative URL path of the portal endpoint to contact.
 */
SkynetClient.prototype.resolveHns = async function (domain, customOptions = {}) {
  const opts = { ...defaultResolveHnsOptions, ...this.customOptions, ...customOptions };
  const url = this.getHnsresUrl(domain, opts);

  // Get the txt record from the hnsres domain on the portal.
  const response = await this.executeRequest({
    ...opts,
    method: "get",
    url,
  });

  return response.data;
};
