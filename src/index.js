// export { getBlocklist, updateBlocklist } from "./blocklist.js";
// export { getPortals, updatePortals } from "./portals.js";
export { download, getDownloadUrl, open } from "./download.js";
// export { addSkykey, createSkykey, getSkykeyById, getSkykeyByName, getSkykeys } from "./encryption.js";
// export { getStats } from "./stats.js";
export { upload, uploadDirectory } from "./upload.js";
export { defaultPortalUrl, getRelativeFilePath, getRootDirectory, parseSkylink } from "./utils.js";

// import { getBlocklist, updateBlocklist } from "./blocklist.js";
// import { getPortals, updatePortals } from "./portals.js";
import { download, getDownloadUrl, open } from "./download.js";
// import { addSkykey, createSkykey, getSkykeyById, getSkykeyByName, getSkykeys } from "./encryption.js";
// import { getStats } from "./stats.js";
import { upload, uploadDirectory } from "./upload.js";
import { defaultPortalUrl, parseSkylink } from "./utils.js";

export default function SkynetClient(portalUrl = defaultPortalUrl) {
  // this.getBlocklist = getBlocklist.bind(null, portalUrl);
  // this.updateBlocklist = updateBlocklist.bind(null, portalUrl);

  /* TODO: convert */

  // this.getPortals = getPortals.bind(null, portalUrl);
  // this.updatePortals = updatePortals.bind(null, portalUrl);

  this.download = download.bind(null, portalUrl);
  this.getDownloadUrl = getDownloadUrl.bind(null, portalUrl);
  this.open = open.bind(null, portalUrl);

  // this.addSkykey = addSkykey.bind(null, portalUrl);
  // this.createSkykey = createSkykey.bind(null, portalUrl);
  // this.getSkykeyById = getSkykeyById.bind(null, portalUrl);
  // this.getSkykeyByName = getSkykeyByName.bind(null, portalUrl);
  // this.getSkykeys = getSkykeys.bind(null, portalUrl);

  /* TODO: ls */

  /* TODO: pin */

  // this.getStats = getStats.bind(null, portalUrl);

  this.upload = upload.bind(null, portalUrl);
  this.uploadDirectory = uploadDirectory.bind(null, portalUrl);

  this.open = open.bind(null, portalUrl);
  this.parseSkylink = parseSkylink;
}
