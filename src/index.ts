export { SkynetClient } from "./client";

// Get the following files to run or the client's methods won't be defined.
export {} from "./download";
export {} from "./encryption";
export {} from "./upload";

export { FILEID_V1, FileType, NewFileID, User, SkyFile } from "./skydb";
export type { SignedRegistryValue, RegistryValue } from "./registry";

export {
  defaultPortalUrl,
  defaultSkynetPortalUrl,
  getRelativeFilePath,
  getRootDirectory,
  parseSkylink,
  uriHandshakePrefix,
  uriHandshakeResolverPrefix,
  uriSkynetPrefix,
} from "./utils";
