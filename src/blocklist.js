/* eslint-disable no-unused-vars */

import { defaultOptions, SkynetClient } from "./utils.js";

const defaultGetBlocklistOptions = {
  ...defaultOptions("/skynet/blocklist"),
};

const defaultUpdateBlocklistOptions = {
  ...defaultOptions("/skynet/blocklist"),
};

SkynetClient.prototype.getBlocklist = async function (customOptions = {}) {
  const opts = { ...defaultGetBlocklistOptions, ...this.customOptions, ...customOptions };

  throw new Error("Unimplemented");
};

SkynetClient.prototype.updateBlocklist = async function (additions, removals, customOptions = {}) {
  const opts = { ...defaultUpdateBlocklistOptions, ...this.customOptions, ...customOptions };

  throw new Error("Unimplemented");
};
