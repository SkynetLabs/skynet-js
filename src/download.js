import { makeUrlWithSkylink, defaultOptions } from "./utils.js";

const defaultDownloadOptions = {
  ...defaultOptions,
  endpointPath: "/",
};

export function download(portalUrl, skylink, customOptions = {}) {
  const opts = { ...defaultDownloadOptions, ...customOptions, download: true };
  const url = getDownloadUrl(portalUrl, skylink, opts);

  window.open(url, "_blank");
}

export function getDownloadUrl(portalUrl, skylink, customOptions = {}) {
  const opts = { ...defaultDownloadOptions, ...customOptions };
  const query = opts.download ? { attachment: true } : {};

  return makeUrlWithSkylink(portalUrl, opts.endpointPath, skylink, query);
}

export function open(portalUrl, skylink, customOptions = {}) {
  const opts = { ...defaultDownloadOptions, ...customOptions };
  const url = makeUrlWithSkylink(portalUrl, opts.endpointPath, skylink);

  window.open(url, "_blank");
}
