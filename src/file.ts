import { SkynetClient } from "./client";
import { deriveDiscoverableTweak } from "./mysky/tweak";
import { CustomGetJSONOptions, VersionedEntryData } from "./skydb";
import { uint8ArrayToString } from "./utils/string";

export async function getJSON(
  this: SkynetClient,
  userID: string,
  path: string,
  opts?: CustomGetJSONOptions,
): Promise<VersionedEntryData> {
  const dataKey = deriveDiscoverableTweak(path);

  return await this.db.getJSON(userID, uint8ArrayToString(dataKey), opts);
}
