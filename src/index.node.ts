import { SkynetClient as Client } from "./client";
export { deriveChildSeed, genKeyPairAndSeed, genKeyPairFromSeed } from "./crypto";
export type { PublicKey, SecretKey, Signature } from "./crypto";
export type { SignedRegistryEntry, RegistryEntry } from "./registry";

export class SkynetClient extends Client {
  downloadFile: () => undefined;
  downloadFileHns: () => undefined;
  openFile: () => undefined;
  openFileHns: () => undefined;
  uploadFile: () => undefined;
  uploadFileRequest: () => undefined;
  uploadDirectory: () => undefined;
  uploadDirectoryRequest: () => undefined;
}

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
