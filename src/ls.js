/* eslint-disable no-unused-vars */

import { defaultOptions } from "./utils.js";

const defaultLsOptions = {
  ...defaultOptions,
};

export function ls(portalUrl, customOptions = {}) {
  const opts = { ...defaultLsOptions, ...customOptions };

  throw new Error("Unimplemented");
}
