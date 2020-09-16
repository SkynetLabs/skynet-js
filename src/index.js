export { SkynetClient } from "./client.js";

// Get the following files to run or the client's methods won't be defined.
export {} from "./download.js";
export {} from "./encryption.js";
export {} from "./upload.js";

export {
  defaultPortalUrl,
  defaultSkynetPortalUrl,
  getRelativeFilePath,
  getRootDirectory,
  parseSkylink,
  uriHandshakePrefix,
  uriHandshakeResolverPrefix,
  uriSkynetPrefix,
} from "./utils.js";
