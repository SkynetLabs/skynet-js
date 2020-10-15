import { pkcs5, pki } from "node-forge";
import { HashFileID, HashRegistryValue } from "./crypto";
import { RegistryValue, SignedRegistryValue } from "./registry";
import { timeout, trimUriPrefix, uriSkynetPrefix } from "./utils";

// FILEID_V1 represents version 1 of the FileID object
export const FILEID_V1 = 1;

// FileType is the type of the file
export enum FileType {
  Invalid, // 0 is invalid
  PublicUnencrypted,
}

// getFile will lookup the entry for given skappID and filename, if it exists it
// will try and download the file behind the skylink it has found in the entry.
export async function getFile(user: User, fileID: FileID): Promise<SkyFile> {  
  // lookup the registry entry
  const existing = await this.lookupRegistry(user, fileID);
  if (!existing) {
    throw new Error("not found");
  }

  // download the data in that Skylink
  const skylink = existing.value.data;  
  const response = await this.executeRequest({
    ...this.customOptions,
    method: "get",
    url: this.getSkylinkUrl(skylink),
  });

  // wrap the data in a skyfile and return it
  const metadata = JSON.parse(response.headers['skynet-file-metadata'])
  const file = new SkyFile(new File(
    [response.data],
    metadata.filename,
    { type: 'text/plain' }
  ));
  return file
}

// setFile uploads a file and sets updates the registry
export async function setFile(user: User, fileID: FileID, file: SkyFile): Promise<boolean> {
  // upload the file to acquire its skylink
  const customFilename = fileID.filename;
  const skylink = await this.uploadFile(file.file, { customFilename });

  let existing: SignedRegistryValue | null;

  try {
    // fetch the current value to find out the revision
    const result = (await Promise.all([timeout(2000), this.lookupRegistry(user, fileID)])) as [
      null,
      SignedRegistryValue | null
    ];
    existing = result[1];
  } catch (error) {
    existing = null;
  }

  // TODO: we could (/should?) verify here

  // build the registry value
  const value: RegistryValue = {
    tweak: HashFileID(fileID),
    data: trimUriPrefix(skylink, uriSkynetPrefix),
    revision: existing ? existing.value.revision + 1 : 0,
  };

  // sign it
  const signature = user.sign({ message: HashRegistryValue(value) });

  // update the registry
  const updated = await this.updateRegistry(user, fileID, { value, signature });
  return updated;
}

// FileID represents a File
export class FileID {
  public version = FILEID_V1;

  public constructor(public applicationID: string, public fileType: FileType, public filename: string) {
    // validate file type
    if (fileType !== FileType.PublicUnencrypted) {
      throw new Error("invalid file type");
    }
  }
}

// User represents a user entity and can be used to sign.
export class User {
  public id: string;
  public publicKey: pki.ed25519.NativeBuffer;
  protected secretKey: pki.ed25519.NativeBuffer;

  // NOTE: username should be the user's email address as ideally it's unique
  public constructor(username: string, password: string) {
    const seed = pkcs5.pbkdf2(password, username, 1000, 32);
    const { publicKey, privateKey } = pki.ed25519.generateKeyPair({ seed });
    this.publicKey = publicKey;
    this.secretKey = privateKey;
    this.id = publicKey.toString("hex");
  }

  public sign(options: pki.ed25519.ToNativeBufferParameters): pki.ed25519.NativeBuffer {
    return pki.ed25519.sign({ ...options, privateKey: this.secretKey });
  }
}

// SkyFile wraps a File.
export class SkyFile {
  public constructor(public file: File) {}
}
