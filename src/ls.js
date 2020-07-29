/* eslint-disable no-unused-vars */

import { defaultOptions, SkynetClient } from "./utils.js";

const defaultLsOptions = {
  ...defaultOptions(""),
  endpointPathLsDir: "/renter/dir",
  endpointPathLsFile: "/renter/file",
};

SkynetClient.prototype.ls = async function (customOptions = {}) {
  const opts = { ...defaultLsOptions, ...customOptions };

  throw new Error("Unimplemented");
};
