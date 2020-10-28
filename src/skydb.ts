import { pki } from "node-forge";
import { SkynetClient } from "./client";
import { HashRegistryEntry, PublicKey, SecretKey } from "./crypto";
import { RegistryEntry, SignedRegistryEntry } from "./registry";
import { parseSkylink, trimUriPrefix, uriSkynetPrefix } from "./utils";

/**
 * Gets the JSON object corresponding to the publicKey and dataKey.
 * @param publicKey - The user public key.
 * @param dataKey - The key of the data to fetch for the given user.
 * @param [customOptions={}] - Additional settings that can optionally be set.
 * @param [customOptions.timeout=5000] - Timeout in ms for the registry lookup.
 */
export async function getJSON(
  this: SkynetClient,
  publicKey: PublicKey,
  dataKey: string,
  customOptions = {}
): Promise<{ data: Record<string, unknown>; revision: number } | null> {
  const opts = {
    ...this.customOptions,
    ...customOptions,
  };

  // lookup the registry entry
  const entry: SignedRegistryEntry = await this.registry.getEntry(publicKey, dataKey, opts);
  if (entry === null) {
    return null;
  }

  // Download the data in that Skylink
  // TODO: Replace with download request method.
  const skylink = parseSkylink(entry.entry.data);

  const response = await this.executeRequest({
    ...opts,
    method: "get",
    url: this.getSkylinkUrl(skylink),
  });

  return { data: response.data, revision: entry.entry.revision };
}

export async function setJSON(
  this: SkynetClient,
  privateKey: SecretKey,
  dataKey: string,
  json: Record<string, unknown>,
  revision?: number,
  customOptions = {}
): Promise<void> {
  const opts = {
    ...this.customOptions,
    ...customOptions,
  };

  // Upload the data to acquire its skylink
  // TODO: Replace with upload request method.
  const file = new File([JSON.stringify(json)], dataKey, { type: "application/json" });
  const { skylink } = await this.uploadFileRequest(file, opts);

  const publicKey = pki.ed25519.publicKeyFromPrivateKey({ privateKey });
  if (!revision) {
    // fetch the current value to find out the revision.
    let entry: SignedRegistryEntry;
    try {
      entry = await this.registry.getEntry(publicKey, dataKey, opts);

      // verify here
      if (
        !pki.ed25519.verify({
          message: HashRegistryEntry(entry.entry),
          signature: entry.signature,
          publicKey,
        })
      ) {
        throw new Error("could not verify signature from retrieved, signed registry entry -- possible corrupted entry");
      }

      revision = entry.entry.revision + 1;
    } catch (err) {
      revision = 0;
    }
  }

  // build the registry value
  const entry: RegistryEntry = {
    datakey: dataKey,
    data: trimUriPrefix(skylink, uriSkynetPrefix),
    revision,
  };

  // sign it
  const signature = pki.ed25519.sign({
    message: HashRegistryEntry(entry),
    privateKey,
  });

  // update the registry
  await this.registry.setEntry(publicKey, dataKey, entry, signature);
}
