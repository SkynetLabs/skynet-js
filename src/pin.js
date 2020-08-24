/* eslint-disable no-unused-vars */

import { SkynetClient } from "./client.js";
import { defaultOptions } from "./utils.js";

const defaultPinOptions = {
  ...defaultOptions("/skynet/pin"),
};

const defaultUnpinOptions = {
  ...defaultOptions(""),
  endpointPathUnpinDir: "/renter/dir",
  endpointPathUnpinFile: "/renter/delete",
};

SkynetClient.prototype.pin = async function (skylink, destSiaPath, customOptions = {}) {
  const opts = { ...defaultPinOptions, ...this.customOptions, ...customOptions };

  throw new Error("Unimplemented");
};

SkynetClient.prototype.unpin = async function (siaPath, customOptions = {}) {
  const opts = { ...defaultUnpinOptions, ...this.customOptions, ...customOptions };

  throw new Error("Unimplemented");
};
