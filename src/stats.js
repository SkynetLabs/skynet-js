/* eslint-disable no-unused-vars */

import { defaultOptions, SkynetClient } from "./utils.js";

const defaultGetStatsOptions = {
  ...defaultOptions("/skynet/stats"),
};

SkynetClient.prototype.getStats = async function (customOptions = {}) {
  const opts = { ...defaultGetStatsOptions, ...customOptions };

  throw new Error("Unimplemented");
};
