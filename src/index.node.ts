export { SkynetClient } from "./client/node";
export { deriveChildSeed, genKeyPairAndSeed, genKeyPairFromSeed } from "./crypto";
export {
  parseSkylink,
  uriHandshakePrefix,
  uriHandshakeResolverPrefix,
  uriSkynetPrefix,
  uriSkynsPrefix,
} from "./utils/skylink";
export { MAX_REVISION } from "./utils/number";
export { defaultPortalUrl, defaultSkynetPortalUrl } from "./utils/url";
export { getRelativeFilePath, getRootDirectory } from "./utils/file";

// Export types.

export type { CustomClientOptions, RequestConfig } from "./client/index";
export type { Signature } from "./crypto";
export type { CustomDownloadOptions, ResolveHnsResponse } from "./download";
export type { CustomGetEntryOptions, CustomSetEntryOptions, SignedRegistryEntry, RegistryEntry } from "./registry";
export type { CustomGetJSONOptions, CustomSetJSONOptions, VersionedEntryData } from "./skydb";
export type { CustomUploadOptions, UploadRequestResponse } from "./upload/index";
export type { ParseSkylinkOptions } from "./utils/skylink";
