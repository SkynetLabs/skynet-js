/* eslint-disable no-unused-vars */

import { defaultOptions } from "./utils.js";

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

export async function addSkykey(portalUrl, skykey, customOptions = {}) {
  throw new Error("Unimplemented");
}

export async function createSkykey(portalUrl, skykeyName, skykeyType, customOptions = {}) {
  throw new Error("Unimplemented");
}

export async function getSkykeyById(portalUrl, skykeyId, customOptions = {}) {
  throw new Error("Unimplemented");
}

export async function getSkykeyByName(portalUrl, skykeyName, customOptions = {}) {
  throw new Error("Unimplemented");
}

export async function getSkykeys(portalUrl, customOptions = {}) {
  throw new Error("Unimplemented");
}
