import axios from "axios";

import { addUrlQuery, defaultPortalUrl, makeUrl } from "./utils.js";

export class SkynetClient {
  constructor(portalUrl = null) {
    if (portalUrl === null) {
      portalUrl = defaultPortalUrl();
    }
    this.portalUrl = portalUrl;
  }

  /**
   * Creates and executes a request.
   * @param {Object} config - Configuration for the request.
   * @param {string} config.method - HTTP method to use.
   * @param {Object} [config.data=null] - Data to send in a POST.
   * @param {Object} [config.query={}] - Query parameters to include in the URl.
   * @param {Object} [config.customOpts={}] - Additional settings that can optionally be set.
   * @param {string} [customOptions.endpointPath="/"] - The relative URL path of the portal endpoint to contact.
   */
  executeRequest(config) {
    const opts = config.customOpts;
    let url = makeUrl(this.portalUrl, opts.endpointPath, config.path ?? "");
    url = addUrlQuery(url, config.query);

    return axios({
      url: url,
      method: config.method,
      data: config.data,
      auth: opts.APIKey && { username: "", password: opts.APIKey },
      onUploadProgress: opts.onUploadProgress && function ({ loaded, total }) {
          const progress = loaded / total;

          opts.onUploadProgress(progress, { loaded, total });
        },
    });
  }
}
