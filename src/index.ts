export { SkynetClient } from "./client";
export { deriveChildSeed, genKeyPairAndSeed, genKeyPairFromSeed } from "./crypto";
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

// Export types.

export type { CustomClientOptions } from "./client";
export type { PublicKey, SecretKey, Signature } from "./crypto";
export type { CustomDownloadOptions, ResolveHnsResponse } from "./download";
export type { CustomGetEntryOptions, CustomSetEntryOptions, SignedRegistryEntry, RegistryEntry } from "./registry";
export type { CustomGetJSONOptions, CustomSetJSONOptions } from "./skydb";
export type { CustomUploadOptions, UploadRequestResponse } from "./upload";
export type { ParseSkylinkOptions } from "./utils";
