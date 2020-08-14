/* eslint-disable no-unused-vars */

import { defaultOptions, SkynetClient } from "./utils.js";

const defaultGetPortalsOptions = {
  ...defaultOptions("/skynet/portals"),
};

const defaultUpdatePortalsOptions = {
  ...defaultOptions("/skynet/portals"),
};

SkynetClient.prototype.getPortal = async function (customOptions = {}) {
  const opts = { ...defaultGetPortalsOptions, ...this.customOptions, ...customOptions };

  throw new Error("Unimplemented");
};

SkynetClient.prototype.updatePortals = async function (additions, removals, customOptions = {}) {
  const opts = { ...defaultUpdatePortalsOptions, ...this.customOptions, ...customOptions };

  throw new Error("Unimplemented");
};
