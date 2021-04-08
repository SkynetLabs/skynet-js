import { SkynetClient } from "./client";
import { deriveDiscoverableTweak } from "./mysky/tweak";
import { CustomGetJSONOptions, JSONResponse } from "./skydb";
import { uint8ArrayToString } from "./utils/string";

export async function getJSON(
  this: SkynetClient,
  userID: string,
  path: string,
  opts?: CustomGetJSONOptions
): Promise<JSONResponse> {
  const dataKey = deriveDiscoverableTweak(path);

  return await this.db.getJSON(userID, uint8ArrayToString(dataKey), opts);
}
