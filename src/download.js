/* eslint-disable no-unused-vars */

import axios from "axios";

import { SkynetClient } from "./client.js";
import { addUrlQuery, defaultOptions, makeUrl, parseSkylink, trimUriPrefix, uriHandshakePrefix } from "./utils.js";

const defaultDownloadOptions = {
  ...defaultOptions("/"),
};
const defaultDownloadHnsOptions = {
  ...defaultOptions("/hns"),
};

/**
 * Initiates a download of the content at the skylink within the browser.
 * @param {string} skylink - 46 character skylink.
 * @param {Object} [customOptions={}] - Additional settings that can optionally be set.
 * @param {string} [customOptions.endpointPath="/"] - The relative URL path of the portal endpoint to contact.
 */
SkynetClient.prototype.download = function (skylink, customOptions = {}) {
  const opts = { ...defaultDownloadOptions, ...this.customOptions, ...customOptions, download: true };
  const url = this.getDownloadUrl(skylink, opts);

  window.open(url, "_blank");
};

SkynetClient.prototype.downloadHns = async function (domain, customOptions = {}) {
  const opts = { ...defaultDownloadHnsOptions, ...this.customOptions, ...customOptions };
};

SkynetClient.prototype.downloadHnsres = async function (domain, customOptions = {}) {
  const opts = { ...defaultDownloadHnsOptions, ...this.customOptions, ...customOptions };
};

SkynetClient.prototype.getDownloadUrl = function (skylink, customOptions = {}) {
  const opts = { ...defaultDownloadOptions, ...this.customOptions, ...customOptions };
  const query = opts.download ? { attachment: true } : {};

  const url = makeUrl(this.portalUrl, opts.endpointPath, parseSkylink(skylink));
  return addUrlQuery(url, query);
};

SkynetClient.prototype.metadata = async function (skylink, customOptions = {}) {
  const opts = { ...defaultDownloadOptions, ...this.customOptions, ...customOptions };

  throw new Error("Unimplemented");
};

/**
 * Opens the content at the skylink within the browser.
 * @param {string} skylink - 46 character skylink.
 * @param {Object} [customOptions={}] - Additional settings that can optionally be set.
 * @param {string} [customOptions.endpointPath="/"] - The relative URL path of the portal endpoint to contact.
 */
SkynetClient.prototype.open = function (skylink, customOptions = {}) {
  const opts = { ...defaultDownloadOptions, ...this.customOptions, ...customOptions };
  const url = makeUrl(this.portalUrl, opts.endpointPath, parseSkylink(skylink));

  window.open(url, "_blank");
};

/**
 * Opens the content at the skylink from the given Handshake domain within the browser.
 * @param {string} hns - Handshake domain.
 * @param {Object} [customOptions={}] - Additional settings that can optionally be set.
 * @param {string} [customOptions.endpointPath="/hns"] - The relative URL path of the portal endpoint to contact.
 */
SkynetClient.prototype.openHns = async function (domain, customOptions = {}) {
  const opts = { ...defaultDownloadHnsOptions, ...this.customOptions, ...customOptions };

  domain = trimUriPrefix(domain, uriHandshakePrefix);

  // Get the skylink from the hns domain on the portal.
  const response = await this.executeRequest({ ...opts, method: "get", extraPath: domain });
  const skylink = response.data.skylink;

  this.open(skylink, customOptions);
};

SkynetClient.prototype.openHnsres = async function (domain, customOptions = {}) {
  const opts = { ...defaultDownloadHnsOptions, ...this.customOptions, ...customOptions };
};
