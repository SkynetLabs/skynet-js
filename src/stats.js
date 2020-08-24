/* eslint-disable no-unused-vars */

import { SkynetClient } from "./client.js";
import { defaultOptions } from "./utils.js";

const defaultGetStatsOptions = {
  ...defaultOptions("/skynet/stats"),
};

SkynetClient.prototype.getStats = async function (customOptions = {}) {
  const opts = { ...defaultGetStatsOptions, ...this.customOptions, ...customOptions };

  throw new Error("Unimplemented");
};
