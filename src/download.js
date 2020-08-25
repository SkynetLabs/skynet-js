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
  ...defaultOptions("/"),
  hnsEndpointPath: "/hns",
};
const defaultResolveHnsOptions = {
  ...defaultOptions("/"),
  hnsresEndpointPath: "/hnsres",
};

/**
 * Initiates a download of the content of the skylink within the browser.
 * @param {string} skylink - 46 character skylink.
 * @param {Object} [customOptions={}] - Additional settings that can optionally be set.
 * @param {string} [customOptions.endpointPath="/"] - The relative URL path of the portal endpoint to contact.
 */
SkynetClient.prototype.downloadFile = function (skylink, customOptions = {}) {
  const opts = { ...defaultDownloadOptions, ...this.customOptions, ...customOptions, download: true };
  const url = this.getDownloadUrl(skylink, opts);

  window.open(url, "_blank");
};

/**
 * Initiates a download of the content of the skylink at the Handshake domain.
 * @param {string} domain - Handshake domain.
 * @param {Object} [customOptions={}] - Additional settings that can optionally be set.
 * @param {string} [customOptions.endpointPath="/hns"] - The relative URL path of the portal endpoint to contact.
 * @param {string} [customOptions.endpointPath="/"] - The relative URL path of the portal endpoint to download from.
 */
SkynetClient.prototype.downloadHns = async function (domain, customOptions = {}) {
  const opts = { ...defaultDownloadHnsOptions, ...this.customOptions, ...customOptions };

  domain = trimUriPrefix(domain, uriHandshakePrefix);

  // Get the skylink from the hns domain on the portal.
  const response = await this.executeRequest({
    ...opts,
    method: "get",
    endpointPath: opts.hnsEndpointPath,
    extraPath: domain,
  });
  const skylink = response.data.skylink;
  if (!skylink) {
    throw new Error("No skylink was returned");
  }

  // Download the returned skylink.
  this.downloadFile(skylink, customOptions);
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
 * Opens the content of the skylink within the browser.
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
 * Opens the content of the skylink from the given Handshake domain within the browser.
 * @param {string} domain - Handshake domain.
 * @param {Object} [customOptions={}] - Additional settings that can optionally be set.
 * @param {string} [customOptions.hnsEndpointPath="/hns"] - The relative URL path of the portal endpoint to contact.
 * @param {string} [customOptions.endpointPath="/"] - The relative URL path of the portal endpoint to download from.
 */
SkynetClient.prototype.openHns = async function (domain, customOptions = {}) {
  const opts = { ...defaultDownloadHnsOptions, ...this.customOptions, ...customOptions };

  domain = trimUriPrefix(domain, uriHandshakePrefix);

  // Get the skylink from the hns domain on the portal.
  const response = await this.executeRequest({
    ...opts,
    method: "get",
    endpointPath: opts.hnsEndpointPath,
    extraPath: domain,
  });
  const skylink = response.data.skylink;
  if (!skylink) {
    throw new Error("No skylink was returned");
  }

  // Open the returned skylink in a new tab.
  this.open(skylink, customOptions);
};

/**
 * @param {string} domain - Handshake resolver domain.
 * @param {Object} [customOptions={}] - Additional settings that can optionally be set.
 * @param {string} [customOptions.hnsresEndpointPath="/hnsres"] - The relative URL path of the portal endpoint to contact.
 */
SkynetClient.prototype.resolveHns = async function (domain, customOptions = {}) {
  const opts = { ...defaultResolveHnsOptions, ...this.customOptions, ...customOptions };

  domain = trimUriPrefix(domain, uriHandshakeResolverPrefix);

  // Get the txt record from the hnsres domain on the portal.
  const response = await this.executeRequest({
    ...opts,
    method: "get",
    endpointPath: opts.hnsresEndpointPath,
    extraPath: domain,
  });

  return response.data;
};
