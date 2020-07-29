/* eslint-disable no-unused-vars */

import { defaultOptions, SkynetClient } from "./utils.js";

const defaultPinOptions = {
  ...defaultOptions("/skynet/pin"),
};

const defaultUnpinOptions = {
  ...defaultOptions(""),
  endpointPathUnpinDir: "/renter/dir",
  endpointPathUnpinFile: "/renter/delete",
};

SkynetClient.prototype.pin = async function (skylink, destSiaPath, customOptions = {}) {
  const opts = { ...defaultPinOptions, ...customOptions };

  throw new Error("Unimplemented");
};

SkynetClient.prototype.unpin = async function (siaPath, customOptions = {}) {
  const opts = { ...defaultUnpinOptions, ...customOptions };

  throw new Error("Unimplemented");
};
