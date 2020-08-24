/* eslint-disable no-unused-vars */

import { SkynetClient } from "./client.js";
import { defaultOptions } from "./utils.js";

const defaultListFilesOptions = {
  ...defaultOptions(""),
  endpointPathListFilesDir: "/renter/dir",
  endpointPathListFilesFile: "/renter/file",
};

SkynetClient.prototype.listFiles = async function (customOptions = {}) {
  const opts = { ...defaultListFilesOptions, ...this.customOptions, ...customOptions };

  throw new Error("Unimplemented");
};
