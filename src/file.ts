import { SkynetClient } from "./client";
import { deriveDiscoverableTweak } from "./mysky/tweak";
import { CustomGetJSONOptions, JSONResponse } from "./skydb";
import { uint8ArrayToString } from "./utils/string";
import { validateString } from "./utils/validation";

export async function getJSON(
  this: SkynetClient,
  userID: string,
  path: string,
  opts?: CustomGetJSONOptions
): Promise<JSONResponse> {
  validateString("path", path, "parameter");
  // Rest of validation is done in `getJSON`.

  const dataKey = deriveDiscoverableTweak(path);

  return await this.db.getJSON(userID, uint8ArrayToString(dataKey), opts);
}
