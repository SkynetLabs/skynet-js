export { getBlacklist, updateBlacklist } from "./blacklist.js";
export { getPortals, updatePortals } from "./portals.js";
export { download } from "./download.js";
export { addSkykey, createSkykey, getSkykeyById, getSkykeyByName, listSkykeys } from "./encryption.js";
export { getStatistics } from "./statistics.js";
export { upload, uploadDirectory } from "./upload.js";
export { defaultPortalUrl, open, getUrl, parseSkylink } from "./utils.js";

import { getBlacklist, updateBlacklist } from "./blacklist.js";
import { getPortals, updatePortals } from "./portals.js";
import { download } from "./download.js";
import { addSkykey, createSkykey, getSkykeyById, getSkykeyByName, listSkykeys } from "./encryption.js";
import { getStatistics } from "./statistics.js";
import { upload, uploadDirectory } from "./upload.js";
import { defaultPortalUrl, open, getUrl, parseSkylink } from "./utils.js";

export default function SkynetClient(portalUrl = defaultPortalUrl) {
  this.getBlacklist = getBlacklist.bind(null, portalUrl);
  this.updateBlacklist = updateBlacklist.bind(null, portalUrl);

  this.getPortals = getPortals.bind(null, portalUrl);
  this.updatePortals = updatePortals.bind(null, portalUrl);

  this.download = download.bind(null, portalUrl);

  this.addSkykey = addSkykey.bind(null, portalUrl);
  this.createSkykey = createSkykey.bind(null, portalUrl);
  this.getSkykeyById = getSkykeyById.bind(null, portalUrl);
  this.getSkykeyByName = getSkykeyByName.bind(null, portalUrl);
  this.listSkykeys = listSkykeys.bind(null, portalUrl);

  this.getStatistics = getStatistics.bind(null, portalUrl);

  this.upload = upload.bind(null, portalUrl);
  this.uploadDirectory = uploadDirectory.bind(null, portalUrl);

  this.open = open.bind(null, portalUrl);
  this.getUrl = getUrl.bind(null, portalUrl);
  this.parseSkylink = parseSkylink;
}
