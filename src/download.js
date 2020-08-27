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
 */
SkynetClient.prototype.downloadFile = function (skylink, customOptions = {}) {
  const opts = { ...defaultDownloadOptions, ...this.customOptions, ...customOptions, download: true };
  const url = this.getSkylinkUrl(skylink, opts);

  // Download the url.
  window.location = url;
};

/**
 * Initiates a download of the content of the skylink at the Handshake domain.
 * @param {string} domain - Handshake domain.
 * @param {Object} [customOptions={}] - Additional settings that can optionally be set.
 * @param {string} [customOptions.endpointPath="/hns"] - The relative URL path of the portal endpoint to contact.
 */
SkynetClient.prototype.downloadFileHns = async function (domain, customOptions = {}) {
  const opts = { ...defaultDownloadHnsOptions, ...this.customOptions, ...customOptions, download: true };
  const url = this.getHnsUrl(domain, opts);

  // Download the url.
  window.location = url;
};

SkynetClient.prototype.getSkylinkUrl = function (skylink, customOptions = {}) {
  const opts = { ...defaultDownloadOptions, ...this.customOptions, ...customOptions };
  const query = opts.download ? { attachment: true } : {};

  const url = makeUrl(this.portalUrl, opts.endpointPath, parseSkylink(skylink));
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

SkynetClient.prototype.metadata = async function (skylink, customOptions = {}) {
  const opts = { ...defaultDownloadOptions, ...this.customOptions, ...customOptions };

  throw new Error("Unimplemented");
};

/**
 * Opens the content of the skylink within the browser.
 * @param {string} skylink - 46 character skylink.
 * @param {Object} [customOptions={}] - Additional settings that can optionally be set.
 * @param {string} [customOptions.endpointPath="/"] - The relative URL path of the portal endpoint to contact.
 */
SkynetClient.prototype.openFile = function (skylink, customOptions = {}) {
  const opts = { ...defaultDownloadOptions, ...this.customOptions, ...customOptions };
  const url = this.getSkylinkUrl(skylink, opts);

  window.open(url, "_blank");
};

/**
 * Opens the content of the skylink from the given Handshake domain within the browser.
 * @param {string} domain - Handshake domain.
 * @param {Object} [customOptions={}] - Additional settings that can optionally be set.
 * @param {string} [customOptions.endpointPath="/hns"] - The relative URL path of the portal endpoint to contact.
 */
SkynetClient.prototype.openFileHns = async function (domain, customOptions = {}) {
  const opts = { ...defaultDownloadHnsOptions, ...this.customOptions, ...customOptions };
  const url = this.getHnsUrl(domain, opts);

  // Open the url in a new tab.
  window.open(url, "_blank");
};

/**
 * @param {string} domain - Handshake resolver domain.
 * @param {Object} [customOptions={}] - Additional settings that can optionally be set.
 * @param {string} [customOptions.endpointPath="/hnsres"] - The relative URL path of the portal endpoint to contact.
 */
SkynetClient.prototype.resolveSkylinkHns = async function (domain, customOptions = {}) {
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
