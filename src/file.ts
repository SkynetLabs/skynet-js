import { SkynetClient } from "./client";
import { deriveDiscoverableTweak } from "./mysky/tweak";
import { defaultGetEntryOptions } from "./registry";
import { CustomGetJSONOptions, defaultGetJSONOptions, JSONResponse } from "./skydb";
import { validateOptionalObject, validateString } from "./utils/validation";

/**
 * Gets Discoverable JSON at the given data path for the given public user ID.
 *
 * @param this - SkynetClient
 * @param userID - The public user ID.
 * @param path - The data path.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - An object containing the json data as well as the skylink for the data.
 */
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

/**
 * Gets the entry link for the entry at the given data path, for the given
 * public user ID. This is a v2 skylink. This link stays the same even if the
 * content at the entry changes.
 *
 * @param this - SkynetClient
 * @param userID - The public user ID.
 * @param path - The data path.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - The entry link.
 */
export async function getEntryLink(this: SkynetClient, userID: string, path: string): Promise<string> {
  validateString("userID", userID, "parameter");
  validateString("path", path, "parameter");

  const dataKey = deriveDiscoverableTweak(path);
  const opts = defaultGetEntryOptions;
  opts.hashedDataKeyHex = true; // Do not hash the tweak anymore.

  return await this.registry.getEntryLink(userID, dataKey, opts);
}
