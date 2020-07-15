import { getUrl, parseSkylink } from "./utils.js";

export function download(portalUrl, skylink) {
  const url = getUrl(portalUrl, parseSkylink(skylink), { download: true });

  window.open(url, "_blank");
}
