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

export async function addSkykey(skykey: string, customOptions = {}) {
  throw new Error("Unimplemented");
}

export async function createSkykey(skykeyName: string, skykeyType: string, customOptions = {}) {
  throw new Error("Unimplemented");
}

export async function getSkykeyById(skykeyId: string, customOptions = {}) {
  throw new Error("Unimplemented");
}

export async function getSkykeyByName(skykeyName: string, customOptions = {}) {
  throw new Error("Unimplemented");
}

export async function getSkykeys(customOptions = {}) {
  throw new Error("Unimplemented");
}
