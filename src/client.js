import { defaultPortalUrl } from "./utils.js";

export class SkynetClient {
  constructor(portalUrl = null) {
    if (portalUrl === null) {
      portalUrl = defaultPortalUrl();
    }
    this.portalUrl = portalUrl;
  }
}
