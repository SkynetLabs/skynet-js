import { SkynetClient } from "./client";
import { deriveDiscoverableTweak } from "./mysky/tweak";
import { CustomGetJSONOptions, defaultGetJSONOptions, JSONResponse } from "./skydb";
import { validateOptionalObject, validateString } from "./utils/validation";

export async function getJSON(
  this: SkynetClient,
  userID: string,
  path: string,
  customOptions?: CustomGetJSONOptions
): Promise<JSONResponse> {
  validateString("userID", userID, "parameter");
  validateString("path", path, "parameter");
  validateOptionalObject("customOptions", customOptions, "parameter", defaultGetJSONOptions);

  const opts = {
    ...defaultGetJSONOptions,
    ...this.customOptions,
    ...customOptions,
  };

  const dataKey = deriveDiscoverableTweak(path);
  opts.hashedDataKeyHex = true; // Do not hash the tweak anymore.

  return await this.db.getJSON(userID, dataKey, opts);
}
