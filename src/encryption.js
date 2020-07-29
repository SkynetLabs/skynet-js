/* eslint-disable no-unused-vars */

import { defaultOptions, SkynetClient } from "./utils.js";

const defaultAddSkykeyOptions = {
  ...defaultOptions("/skynet/addskykey"),
};

const defaultCreateSkykeyOptions = {
  ...defaultOptions("/skynet/createskykey"),
};

const defaultGetSkykeyOptions = {
  ...defaultOptions("/skynet/skykey"),
};

const defaultGetSkykeysOptions = {
  ...defaultOptions("/skynet/skykeys"),
};

SkynetClient.prototype.addSkykey = async function (skykey, customOptions = {}) {
  throw new Error("Unimplemented");
};

SkynetClient.prototype.createSkykey = async function (skykeyName, skykeyType, customOptions = {}) {
  throw new Error("Unimplemented");
};

SkynetClient.prototype.getSkykeyById = async function (skykeyId, customOptions = {}) {
  throw new Error("Unimplemented");
};

SkynetClient.prototype.getSkykeyByName = async function (skykeyName, customOptions = {}) {
  throw new Error("Unimplemented");
};

SkynetClient.prototype.getSkykeys = async function getSkykeys(customOptions = {}) {
  throw new Error("Unimplemented");
};
