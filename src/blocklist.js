/* eslint-disable no-unused-vars */

import { defaultOptions } from "./utils.js";

const defaultGetBlocklistOptions = {
  ...defaultOptions,
};

const defaultUpdateBlocklistOptions = {
  ...defaultOptions,
};

export function getBlocklist(portalUrl, customOptions = {}) {
  const opts = { ...defaultGetBlocklistOptions, ...customOptions };

  throw new Error("Unimplemented");
}

export function updateBlocklist(portalUrl, additions, removals, customOptions = {}) {
  const opts = { ...defaultUpdateBlocklistOptions, ...customOptions };

  throw new Error("Unimplemented");
}
