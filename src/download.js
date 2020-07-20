import { makeUrlWithSkylink, options } from "./utils.js";

export const defaultDownloadOptions = {
  ...options,
  portalEndpointPath: "/",
};

export function download(portalUrl, skylink, customOptions = {}) {
  const opts = { ...defaultDownloadOptions, ...customOptions };
  opts.download = true;

  const url = getDownloadUrl(portalUrl, skylink, opts);

  window.open(url, "_blank");
}

export function getDownloadUrl(portalUrl, skylink, customOptions = {}) {
  const opts = { ...defaultDownloadOptions, ...customOptions };

  let query = {};
  if (customOptions.download) {
    query = { attachment: true };
  }
  const url = makeUrlWithSkylink(portalUrl, opts.portalEndpointPath, skylink, query);

  return url;
}

export function open(portalUrl, skylink, customOptions = {}) {
  const opts = { ...defaultDownloadOptions, ...customOptions };

  const url = makeUrlWithSkylink(portalUrl, opts.portalEndpointPath, skylink);

  window.open(url, "_blank");
}
