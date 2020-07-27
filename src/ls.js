/* eslint-disable no-unused-vars */

import { defaultOptions } from "./utils.js";

const defaultLsOptions = {
  ...defaultOptions(""),
  endpointPathLsDir: "/renter/dir",
  endpointPathLsFile: "/renter/file",
};

export function ls(portalUrl, customOptions = {}) {
  const opts = { ...defaultLsOptions, ...customOptions };

  throw new Error("Unimplemented");
}
