import { pki } from "node-forge";
import { SkynetClient } from "./client";
import { HashRegistryEntry, PublicKey, SecretKey } from "./crypto";
import { RegistryEntry } from "./registry";
import { parseSkylink, trimUriPrefix, uriSkynetPrefix } from "./utils";

export async function getJSON(
  this: SkynetClient,
  publicKey: PublicKey,
  dataKey: string
): Promise<{ json: object; revision: number } | null> {
  // lookup the registry entry
  const entry = await this.registry.lookup(publicKey, dataKey);
  if (entry === null) {
    throw new Error("not found");
  }

  // Download the data in that Skylink
  // TODO: Replace with download request method.
  let skylink: string;
  try {
    skylink = parseSkylink(entry.value.data);
  } catch (error) {
    throw new Error(`invalid skylink: ${error}`);
  }

  const response = await this.executeRequest({
    ...this.customOptions,
    method: "get",
    url: this.getSkylinkUrl(skylink),
  });

  return { json: response.data, revision: entry.revision };
}

export async function setJSON(
  this: SkynetClient,
  privateKey: SecretKey,
  dataKey: string,
  json: object,
  revision: number = -1
): Promise<boolean> {
  // Upload the data to acquire its skylink
  // TODO: Replace with upload request method.
  const { data } = await this.executeRequest({
    ...this.customOptions,
    method: "post",
    endpointPath: "/skynet/skyfile",
    data: json.toString(),
  });
  const skylink = data.skylink;

  const publicKey = pki.ed25519.publicKeyFromPrivateKey({ privateKey });
  if (revision === -1) {
    // fetch the current value to find out the revision.
    const entry = await this.registry.lookup(publicKey, dataKey);

    if (entry) {
      // verify here
      if (
        !pki.ed25519.verify({
          message: HashRegistryEntry(entry.entry),
          signature: entry.signature,
          publicKey,
        })
      ) {
        throw new Error("could not verify signature");
      }

      revision = entry.revision + 1;
    } else {
      revision = 0;
    }
  }

  // build the registry value
  const entry: RegistryEntry = {
    data: trimUriPrefix(skylink, uriSkynetPrefix),
    revision,
  };

  // sign it
  const signature = pki.ed25519.sign({
    message: HashRegistryEntry(entry),
    privateKey,
  });

  // update the registry
  const updated = await this.registry.update(publicKey, dataKey, entry, signature);
  return updated;
}
