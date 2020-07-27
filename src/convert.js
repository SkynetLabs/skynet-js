/* eslint-disable no-unused-vars */

import { defaultOptions } from "./utils.js";

const defaultConvertOptions = {
  ...defaultOptions("/skynet/skyfile"),
};

export function convert(portalUrl, srcSiaPath, destSiaPath, customOptions = {}) {
  const opts = { ...defaultConvertOptions, ...customOptions };

  throw new Error("Unimplemented");
}
