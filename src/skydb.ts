import { pkcs5, pki } from "node-forge";
import { HashFileID, HashRegistryValue } from "./crypto";
import { RegistryValue, SignedRegistryValue } from "./registry";
import { trimUriPrefix, uriSkynetPrefix } from "./utils";

// FILEID_V1 represents version 1 of the FileID object
export const FILEID_V1 = 1;

// FileType is the type of the file
export enum FileType {
  Invalid, // 0 is invalid
  PublicUnencrypted,
}

// FileID represent a file
export type FileID = {
  version: number;
  applicationID: string;
  fileType: FileType;
  filename: string;
};

// getFile will lookup the entry for given skappID and filename, if it exists it
// will try and download the file behind the skylink it has found in the entry.
export async function getFile(user: User, fileID: FileID) {
  // lookup the registry entry
  const existing = await this.lookupRegistry(user, fileID);
  if (!existing) {
    throw new Error("not found");
  }
  // TODO: should we validate the skylink
  const skylink = existing.value.data;

  this.downloadFile(skylink);
}

// setFile uploads a file and sets updates the registry
export async function setFile(user: User, fileID: FileID, file: SkyFile) {
  // upload the file to acquire its skylink
  const customFilename = fileID.filename;
  const skylink = await this.uploadFile(file.file, { customFilename });

  // fetch the current value to find out the revision
  const existing: SignedRegistryValue | null = await this.lookupRegistry(user, fileID);

  // TODO: we could (/should?) verify here

  // build the registry value
  const value: RegistryValue = {
    tweak: HashFileID(fileID),
    data: trimUriPrefix(skylink, uriSkynetPrefix),
    revision: existing ? existing.value.revision + 1 : 0,
  };

  // sign it
  const signature = user.sign({ message: HashRegistryValue(value) });
  console.log("signature", signature);
  // update the registry
  await this.updateRegistry(user, fileID, { value, signature });
}

// NewFileID takes the input parameters and returns a FileID.
export function NewFileID(applicationID: string, fileType: FileType, filename: string): FileID {
  // validate file type
  if (fileType !== FileType.PublicUnencrypted) {
    throw new Error("invalid file type");
  }

  return {
    version: FILEID_V1,
    applicationID,
    fileType,
    filename,
  };
}

// User represents a user entity and can be used to sign.
export class User {
  public id: string;

  public constructor(public publicKey: pki.ed25519.NativeBuffer, protected secretKey: pki.ed25519.NativeBuffer) {
    this.id = publicKey.toString("hex");
  }

  // New takes a username and password and generates a key pair representing
  // that user, it returns a new User object.
  //
  // NOTE: username should be the user's email address as ideally it's unique
  public static New(username: string, password: string): User {
    const seed = pkcs5.pbkdf2(password, username, 1000, 32);
    const { publicKey, privateKey } = pki.ed25519.generateKeyPair({ seed });
    return new User(publicKey, privateKey);
  }

  public sign(options: pki.ed25519.ToNativeBufferParameters): string {
    return pki.ed25519.sign({ ...options, privateKey: this.secretKey }).toString("hex");
  }
}

// SkyFile wraps a File.
export class SkyFile {
  public static New(file: File): SkyFile {
    return new SkyFile(file);
  }
  public constructor(public file: File) {}
}
