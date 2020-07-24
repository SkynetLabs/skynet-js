/* eslint-disable no-unused-vars */

import { defaultOptions } from "./utils.js";

const defaultPinOptions = {
  ...defaultOptions,
};

const defaultUnpinOptions = {
  ...defaultOptions,
};

export function pin(portalUrl, skylink, destSiaPath, customOptions = {}) {
  const opts = { ...defaultPinOptions, ...customOptions };

  throw new Error("Unimplemented");
}

export function unpin(portalUrl, skylink, destSiaPath, customOptions = {}) {
  const opts = { ...defaultUnpinOptions, ...customOptions };

  throw new Error("Unimplemented");
}
