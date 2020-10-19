import {
  addUrlQuery,
  defaultOptions,
  makeUrl,
  parseSkylink,
  trimUriPrefix,
  uriHandshakePrefix,
  uriHandshakeResolverPrefix,
} from "./utils";

const defaultDownloadOptions = {
  ...defaultOptions("/"),
};
const defaultDownloadHnsOptions = {
  ...defaultOptions("/hns"),
};
const defaultResolveHnsOptions = {
  ...defaultOptions("/hnsres"),
};

/**
 * Initiates a download of the content of the skylink within the browser.
 * @param {string} skylink - 46 character skylink, possibly followed by a path or query parameters. Note that the skylink will not be encoded, so if your path might contain special characters, consider using `customOptions.path`.
 * @param {Object} [customOptions={}] - Additional settings that can optionally be set.
 * @param {string} [customOptions.endpointPath="/"] - The relative URL path of the portal endpoint to contact.
 * @param {string} [customOptions.path] - A path to append to the skylink, e.g. `dir1/dir2/file`. A Unix-style path is expected. Each path component will be URL-encoded.
 * @param {Object} [customOptions.query] - A query object to convert to a query parameter string and append to the skylink.
 * @returns {string} - The full URL that was used.
 */
export function downloadFile(skylink: string, customOptions = {}): string {
  const opts = { ...defaultDownloadOptions, ...this.customOptions, ...customOptions, download: true };
  const url = this.getSkylinkUrl(skylink, opts);

  // Download the url.
  window.location = url;

  return url;
}

/**
 * Initiates a download of the content of the skylink at the Handshake domain.
 * @param {string} domain - Handshake domain.
 * @param {Object} [customOptions={}] - Additional settings that can optionally be set.
 * @param {string} [customOptions.endpointPath="/hns"] - The relative URL path of the portal endpoint to contact.
 * @param {Object} [customOptions.query] - A query object to convert to a query parameter string and append to the URL.
 * @returns {string} - The full URL that was used.
 */
export async function downloadFileHns(domain: string, customOptions = {}): Promise<string> {
  const opts = { ...defaultDownloadHnsOptions, ...this.customOptions, ...customOptions, download: true };
  const url = this.getHnsUrl(domain, opts);

  // Download the url.
  window.location = url;

  return url;
}

export function getSkylinkUrl(skylink: string, customOptions = {}): string {
  const opts = { ...defaultDownloadOptions, ...this.customOptions, ...customOptions };
  const query = opts.query ?? {};
  if (opts.download) {
    query.attachment = true;
  }

  // URL-encode the path.
  let path = "";
  if (opts.path) {
    if (typeof opts.path != "string") {
      throw new Error(`opts.path has to be a string, ${typeof opts.path} provided`);
    }
    // Encode each element of the path separately and join them.
    path = opts.path
      .split("/")
      .map((element: string) => encodeURIComponent(element))
      .join("/");
  }

  const url = makeUrl(this.portalUrl, opts.endpointPath, parseSkylink(skylink), path);
  return addUrlQuery(url, query);
}

export function getHnsUrl(domain: string, customOptions = {}): string {
  const opts = { ...defaultDownloadHnsOptions, ...this.customOptions, ...customOptions };
  const query = opts.query ?? {};
  if (opts.download) {
    query.attachment = true;
  }

  const url = makeUrl(this.portalUrl, opts.endpointPath, trimUriPrefix(domain, uriHandshakePrefix));
  return addUrlQuery(url, query);
}

export function getHnsresUrl(domain: string, customOptions = {}): string {
  const opts = { ...defaultResolveHnsOptions, ...this.customOptions, ...customOptions };

  return makeUrl(this.portalUrl, opts.endpointPath, trimUriPrefix(domain, uriHandshakeResolverPrefix));
}

export async function getMetadata(skylink: string, customOptions = {}) {
  const opts = { ...defaultDownloadOptions, ...this.customOptions, ...customOptions };

  throw new Error("Unimplemented");
}

/**
 * Opens the content of the skylink within the browser.
 * @param {string} skylink - 46 character skylink.
 * @param {Object} [customOptions={}] - Additional settings that can optionally be set. See `downloadFile` for the full list.
 * @returns {string} - The full URL that was used.
 */
export function openFile(skylink: string, customOptions = {}): string {
  const opts = { ...defaultDownloadOptions, ...this.customOptions, ...customOptions };
  const url = this.getSkylinkUrl(skylink, opts);

  window.open(url, "_blank");

  return url;
}

/**
 * Opens the content of the skylink from the given Handshake domain within the browser.
 * @param {string} domain - Handshake domain.
 * @param {Object} [customOptions={}] - Additional settings that can optionally be set. See `downloadFileHns` for the full list.
 * @returns {string} - The full URL that was used.
 */
export async function openFileHns(domain: string, customOptions = {}): Promise<string> {
  const opts = { ...defaultDownloadHnsOptions, ...this.customOptions, ...customOptions };
  const url = this.getHnsUrl(domain, opts);

  // Open the url in a new tab.
  window.open(url, "_blank");

  return url;
}

/**
 * @param {string} domain - Handshake resolver domain.
 * @param {Object} [customOptions={}] - Additional settings that can optionally be set.
 * @param {string} [customOptions.endpointPath="/hnsres"] - The relative URL path of the portal endpoint to contact.
 * @param {Object} [customOptions.query] - A query object to convert to a query parameter string and append to the URL.
 */
export async function resolveHns(domain: string, customOptions = {}): Promise<any> {
  const opts = { ...defaultResolveHnsOptions, ...this.customOptions, ...customOptions };
  const url = this.getHnsresUrl(domain, opts);

  // Get the txt record from the hnsres domain on the portal.
  const response = await this.executeRequest({
    ...opts,
    method: "get",
    url,
  });

  return response.data;
}
