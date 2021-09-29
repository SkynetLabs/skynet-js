/* istanbul ignore file */

// Main exports.

export { SkynetClient } from "./client";
export {
  HASH_LENGTH,
  deriveChildSeed,
  genKeyPairAndSeed,
  genKeyPairFromSeed,
  PUBLIC_KEY_LENGTH,
  PRIVATE_KEY_LENGTH,
  SIGNATURE_LENGTH,
} from "./crypto";
export { getSkylinkUrlForPortal } from "./download";
export { getEntryLink, getEntryUrlForPortal, signEntry, validateRegistryProof } from "./registry";
export {
  DacLibrary,
  MAX_ENTRY_LENGTH,
  MySky,
  MYSKY_DOMAIN,
  mySkyDomain,
  MYSKY_DEV_DOMAIN,
  mySkyDevDomain,
} from "./mysky";
export {
  deriveEncryptedPathKeyEntropy,
  deriveEncryptedPathSeed,
  deriveEncryptedPathTweak,
  ENCRYPTION_PATH_SEED_DIRECTORY_LENGTH,
  ENCRYPTION_PATH_SEED_FILE_LENGTH,
  // Deprecated functions.
  deriveEncryptedFileKeyEntropy,
  deriveEncryptedFileSeed,
  deriveEncryptedFileTweak,
} from "./mysky/encrypted_files";
export { deriveDiscoverableFileTweak } from "./mysky/tweak";
export { convertSkylinkToBase32, convertSkylinkToBase64 } from "./skylink/format";
export { parseSkylink } from "./skylink/parse";
export { isSkylinkV1, isSkylinkV2 } from "./skylink/sia";
export { getRelativeFilePath, getRootDirectory } from "./utils/file";
export { MAX_REVISION } from "./utils/number";
export { stringToUint8ArrayUtf8, uint8ArrayToStringUtf8 } from "./utils/string";
export {
  defaultPortalUrl,
  DEFAULT_SKYNET_PORTAL_URL,
  defaultSkynetPortalUrl,
  extractDomainForPortal,
  getFullDomainUrlForPortal,
  URI_HANDSHAKE_PREFIX,
  uriHandshakePrefix,
  URI_SKYNET_PREFIX,
  uriSkynetPrefix,
} from "./utils/url";

// Re-export Permission API.

export {
  Permission,
  PermCategory,
  PermType,
  PermRead,
  PermWrite,
  PermHidden,
  PermDiscoverable,
  PermLegacySkyID,
} from "skynet-mysky-utils";

// Export types.

export type { CustomClientOptions, RequestConfig } from "./client";
export type { KeyPair, KeyPairAndSeed, Signature } from "./crypto";
export type { CustomDownloadOptions, ResolveHnsResponse } from "./download";
export type { CustomConnectorOptions, EntryData } from "./mysky";
export type { CustomPinOptions, PinResponse } from "./pin";
export type {
  CustomGetEntryOptions,
  CustomSetEntryOptions,
  CustomValidateRegistryProofOptions,
  SignedRegistryEntry,
  RegistryEntry,
  RegistryProofEntry,
} from "./registry";
export type { CustomGetJSONOptions, CustomSetJSONOptions, JSONResponse, RawBytesResponse } from "./skydb";
export type { ParseSkylinkOptions } from "./skylink/parse";
export type { CustomUploadOptions, UploadRequestResponse } from "./upload";
export type { JsonData } from "./utils/types";
