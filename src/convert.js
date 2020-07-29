/* eslint-disable no-unused-vars */

import { defaultOptions, SkynetClient } from "./utils.js";

const defaultConvertOptions = {
  ...defaultOptions("/skynet/skyfile"),
};

SkynetClient.prototype.convert = async function (srcSiaPath, destSiaPath, customOptions = {}) {
  const opts = { ...defaultConvertOptions, ...customOptions };

  throw new Error("Unimplemented");
};
