import parse from "url-parse";

export function open(portalUrl, skylink) {
  const url = getUrl(portalUrl, parseSkylink(skylink));

  window.open(url, "_blank");
}

export function getUrl(portalUrl, skylink, options = {}) {
  const parsed = parse(portalUrl);

  parsed.set("pathname", parseSkylink(skylink));

  if (options.download) {
    parsed.set("query", { attachment: true });
  }

  return parsed.toString();
}

const SKYLINK_MATCHER = "([a-zA-Z0-9_-]{46})";
const SKYLINK_DIRECT_REGEX = new RegExp(`^${SKYLINK_MATCHER}$`);
const SKYLINK_SIA_PREFIXED_REGEX = new RegExp(`^sia:(?://)?${SKYLINK_MATCHER}$`);
const SKYLINK_PATHNAME_REGEX = new RegExp(`^/${SKYLINK_MATCHER}`);
const SKYLINK_REGEXP_MATCH_POSITION = 1;

export function parseSkylink(skylink = "") {
  if (typeof skylink !== "string") throw new Error(`Skylink has to be a string, ${typeof skylink} provided`);

  // check for direct skylink match
  const matchDirect = skylink.match(SKYLINK_DIRECT_REGEX);
  if (matchDirect) return matchDirect[SKYLINK_REGEXP_MATCH_POSITION];

  // check for skylink prefixed with sia: or sia:// and extract it
  // example: sia:XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg
  // example: sia://XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg
  const matchSiaPrefixed = skylink.match(SKYLINK_SIA_PREFIXED_REGEX);
  if (matchSiaPrefixed) return matchSiaPrefixed[SKYLINK_REGEXP_MATCH_POSITION];

  // check for skylink passed in an url and extract it
  // example: https://siasky.net/XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg
  const parsed = parse(skylink);
  const matchPathname = parsed.pathname.match(SKYLINK_PATHNAME_REGEX);
  if (matchPathname) return matchPathname[SKYLINK_REGEXP_MATCH_POSITION];

  throw new Error(`Could not extract skylink from '${skylink}'`);
}
