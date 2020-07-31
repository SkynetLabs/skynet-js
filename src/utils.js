// import axios from "axios";
import path from "path-browserify";
import parse from "url-parse";
import urljoin from "url-join";

export const defaultSkynetPortalUrl = "https://siasky.net";

export const uriHandshakePrefix = "hns:";
export const uriHandshakeResolverPrefix = "hnsres:";
export const uriSkynetPrefix = "sia:";

export function addUrlQuery(url, query) {
  const parsed = parse(url);
  parsed.set("query", query);
  return parsed.toString();
}

export function defaultPortalUrl() {
  var url = new URL(window.location.href);
  return url.href.substring(0, url.href.indexOf(url.pathname));
}

export function defaultOptions(endpointPath) {
  return {
    endpointPath: endpointPath,
    // TODO:
    // APIKey: "",
    // customUserAgent: "",
  };
}

function getFilePath(file) {
  return file.webkitRelativePath || file.path || file.name;
}

export function getRelativeFilePath(file) {
  const filePath = getFilePath(file);
  const { root, dir, base } = path.parse(filePath);
  const relative = path.normalize(dir).slice(root.length).split(path.sep).slice(1);

  return path.join(...relative, base);
}

export function getRootDirectory(file) {
  const filePath = getFilePath(file);
  const { root, dir } = path.parse(filePath);

  return path.normalize(dir).slice(root.length).split(path.sep)[0];
}

/**
 * Properly joins paths together to create a URL. Takes a variable number of
 * arguments.
 */
export function makeUrl() {
  let args = Array.from(arguments);
  return args.reduce(function (acc, cur) {
    return urljoin(acc, cur);
  });
}

const SKYLINK_MATCHER = "([a-zA-Z0-9_-]{46})";
const SKYLINK_DIRECT_REGEX = new RegExp(`^${SKYLINK_MATCHER}$`);
const SKYLINK_PATHNAME_REGEX = new RegExp(`^/${SKYLINK_MATCHER}`);
const SKYLINK_REGEXP_MATCH_POSITION = 1;

export function parseSkylink(skylink) {
  if (typeof skylink !== "string") throw new Error(`Skylink has to be a string, ${typeof skylink} provided`);

  // check for direct skylink match
  const matchDirect = skylink.match(SKYLINK_DIRECT_REGEX);
  if (matchDirect) return matchDirect[SKYLINK_REGEXP_MATCH_POSITION];

  // check for skylink prefixed with sia: or sia:// and extract it
  // example: sia:XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg
  // example: sia://XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg
  skylink = trimUriPrefix(skylink, uriSkynetPrefix);

  // check for skylink passed in an url and extract it
  // example: https://siasky.net/XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg
  const parsed = parse(skylink);
  const matchPathname = parsed.pathname.match(SKYLINK_PATHNAME_REGEX);
  if (matchPathname) return matchPathname[SKYLINK_REGEXP_MATCH_POSITION];

  throw new Error(`Could not extract skylink from '${skylink}'`);
}

export function trimUriPrefix(str, prefix) {
  const longPrefix = `${prefix}//`;
  if (str.startsWith(longPrefix)) {
    // longPrefix is exactly at the beginning
    return str.slice(longPrefix.length);
  }
  if (str.startsWith(prefix)) {
    // else prefix is exactly at the beginning
    return str.slice(prefix.length);
  }
  return str;
}
