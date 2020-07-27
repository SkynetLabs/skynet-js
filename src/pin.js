/* eslint-disable no-unused-vars */

import { defaultOptions } from "./utils.js";

const defaultPinOptions = {
  ...defaultOptions("/skynet/pin"),
};

const defaultUnpinOptions = {
  ...defaultOptions(""),
  endpointPathUnpinDir: "/renter/dir",
  endpointPathUnpinFile: "/renter/delete",
};

export function pin(portalUrl, skylink, destSiaPath, customOptions = {}) {
  const opts = { ...defaultPinOptions, ...customOptions };

  throw new Error("Unimplemented");
}

export function unpin(portalUrl, siaPath, customOptions = {}) {
  const opts = { ...defaultUnpinOptions, ...customOptions };

  throw new Error("Unimplemented");
}
