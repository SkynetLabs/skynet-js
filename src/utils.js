// import axios from "axios";
import path from "path-browserify";
import parse from "url-parse";

export const defaultSkynetPortalUrl = "https://siasky.net";

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

// TODO: Use this to simplify creating requests. Needs to be tested.
// export function executeRequest(portalUrl, method, opts, query, data = {}) {
//   const url = makeUrl(portalUrl, opts.endpointPath, query);

//   return axios({
//     method: method,
//     url: url,
//     data: data,
//     auth: opts.APIKey && {username: "", password: opts.APIKey },
//     onUploadProgress: opts.onUploadProgress && {
//       onUploadProgress: ({ loaded, total }) => {
//         const progress = loaded / total;

//         opts.onUploadProgress(progress, { loaded, total });
//       },
//     }
//   });
// }

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

export function makeUrl(portalUrl, pathname, query = {}) {
  const parsed = parse(portalUrl);

  parsed.set("pathname", pathname);
  parsed.set("query", query);
  return parsed.toString();
}

export function makeUrlWithSkylink(portalUrl, endpointPath, skylink, query = {}) {
  const parsedSkylink = parseSkylink(skylink);

  return makeUrl(portalUrl, path.posix.join(endpointPath, parsedSkylink), query);
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
