import { SkynetClient } from "./client";
import { defaultOptions } from "./utils";

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

export async function addSkykey(this: SkynetClient, skykey: string, customOptions = {}) {
  throw new Error("Unimplemented");
}

export async function createSkykey(this: SkynetClient, skykeyName: string, skykeyType: string, customOptions = {}) {
  throw new Error("Unimplemented");
}

export async function getSkykeyById(this: SkynetClient, skykeyId: string, customOptions = {}) {
  throw new Error("Unimplemented");
}

export async function getSkykeyByName(this: SkynetClient, skykeyName: string, customOptions = {}) {
  throw new Error("Unimplemented");
}

export async function getSkykeys(this: SkynetClient, customOptions = {}) {
  throw new Error("Unimplemented");
}
