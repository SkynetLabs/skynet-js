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
   * @param {string} [config.APIKey] - Authentication password to use.
   * @param {string} [config.customUserAgent=""] - Custom user agent header to set.
   * @param {Object} [config.data=null] - Data to send in a POST.
   * @param {string} [config.endpointPath=""] - The relative URL path of the portal endpoint to contact.
   * @param {string} [config.extraPath=""] - Extra path element to append to the URL.
   * @param {Object} [config.query={}] - Query parameters to include in the URl.
   * @param {Function} [config.onUploadProgress] - Optional callback to track progress.
   */
  executeRequest(config) {
    let url = makeUrl(this.portalUrl, config.endpointPath, config.extraPath ?? "");
    url = addUrlQuery(url, config.query);

    return axios({
      url: url,
      method: config.method,
      data: config.data,
      headers: config.customUserAgent && { "User-Agent": config.customUserAgent },
      auth: config.APIKey && { username: "", password: config.APIKey },
      onUploadProgress:
        config.onUploadProgress &&
        function ({ loaded, total }) {
          const progress = loaded / total;

          config.onUploadProgress(progress, { loaded, total });
        },
    });
  }
}
