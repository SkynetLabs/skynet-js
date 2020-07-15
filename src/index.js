export { upload, uploadDirectory } from "./upload.js";
export { download } from "./download.js";
export { open, getUrl, parseSkylink } from "./utils.js";

import { upload, uploadDirectory } from "./upload.js";
import { download } from "./download.js";
import { open, getUrl, parseSkylink } from "./utils.js";

export default function SkynetClient(portalUrl) {
  this.upload = upload.bind(null, portalUrl);
  this.uploadDirectory = uploadDirectory.bind(null, portalUrl);
  this.download = download.bind(null, portalUrl);
  this.open = open.bind(null, portalUrl);
  this.getUrl = getUrl.bind(null, portalUrl);
  this.parseSkylink = parseSkylink;
}
