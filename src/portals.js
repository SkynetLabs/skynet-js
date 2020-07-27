/* eslint-disable no-unused-vars */

import { defaultOptions } from "./utils.js";

const defaultGetPortalsOptions = {
  ...defaultOptions,
};

const defaultUpdatePortalsOptions = {
  ...defaultOptions,
};

export function getPortals(portalUrl, customOptions = {}) {
  const opts = { ...defaultGetPortalsOptions, ...customOptions };

  throw new Error("Unimplemented");
}

export function updatePortals(portalUrl, additions, removals, customOptions = {}) {
  const opts = { ...defaultUpdatePortalsOptions, ...customOptions };

  throw new Error("Unimplemented");
}
