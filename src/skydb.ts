import { pki } from "node-forge";
import { SkynetClient } from "./client";
import { RegistryEntry, SignedRegistryEntry } from "./registry";
import { parseSkylink, trimUriPrefix, uriSkynetPrefix, toHexString, checkUint64, MAX_REVISION } from "./utils";
import { Buffer } from "buffer";

export type VersionedEntryData = {
  data: Record<string, unknown> | null;
  revision: bigint | null;
};

/**
 * Gets the JSON object corresponding to the publicKey and dataKey.
 * @param publicKey - The user public key.
 * @param dataKey - The key of the data to fetch for the given user.
 * @param [customOptions={}] - Additional settings that can optionally be set.
 * @param [customOptions.timeout=5000] - Timeout in ms for the registry lookup.
 */
export async function getJSON(
  this: SkynetClient,
  publicKey: string,
  dataKey: string,
  customOptions = {}
): Promise<VersionedEntryData> {
  const opts = {
    ...this.customOptions,
    ...customOptions,
  };

  // lookup the registry entry
  const { entry }: { entry: RegistryEntry } = await this.registry.getEntry(publicKey, dataKey, opts);
  if (entry === null) {
    return { data: null, revision: null };
  }

  // Download the data in that Skylink
  // TODO: Replace with download request method.
  const skylink = parseSkylink(entry.data);

  const response = await this.executeRequest({
    ...opts,
    method: "get",
    url: this.getSkylinkUrl(skylink),
  });

  return { data: response.data, revision: entry.revision };
}

/**
 * Sets a JSON object at the registry entry corresponding to the publicKey and dataKey.
 *
 * @throws - Will throw if the given entry revision does not fit in 64 bits, or if the revision was not given, if the latest revision of the entry is the maximum revision allowed.
 */
export async function setJSON(
  this: SkynetClient,
  privateKey: string,
  dataKey: string,
  json: Record<string, unknown>,
  revision?: bigint,
  customOptions = {}
): Promise<void> {
  const opts = {
    ...this.customOptions,
    ...customOptions,
  };

  const privateKeyBuffer = Buffer.from(privateKey, "hex");

  if (revision === undefined) {
    // fetch the current value to find out the revision.
    let entry: SignedRegistryEntry;
    try {
      const publicKey = pki.ed25519.publicKeyFromPrivateKey({ privateKey: privateKeyBuffer });
      entry = await this.registry.getEntry(toHexString(publicKey), dataKey, opts);
      revision = entry.entry.revision + BigInt(1);
    } catch (err) {
      revision = BigInt(0);
    }

    // Throw if the revision is already the maximum value.
    if (revision > MAX_REVISION) {
      throw new Error("Current entry already has maximum allowed revision, could not update the entry");
    }
  } else {
    // Assert the input is 64 bits.
    checkUint64(revision);
  }

  // Upload the data to acquire its skylink
  // TODO: Replace with upload request method.
  const file = new File([JSON.stringify(json)], dataKey, { type: "application/json" });
  const { skylink } = await this.uploadFileRequest(file, opts);

  // build the registry value
  const entry: RegistryEntry = {
    datakey: dataKey,
    data: trimUriPrefix(skylink, uriSkynetPrefix),
    revision,
  };

  // update the registry
  await this.registry.setEntry(privateKey, entry);
}
