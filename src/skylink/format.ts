import { BASE32_ENCODED_SKYLINK_SIZE, BASE64_ENCODED_SKYLINK_SIZE } from "./sia";
import { decodeSkylinkBase32, decodeSkylinkBase64, encodeSkylinkBase32, encodeSkylinkBase64 } from "../utils/encoding";
import { trimUriPrefix } from "../utils/string";
import { uriSkynetPrefix } from "../utils/url";
import { validateStringLen } from "../utils/validation";

/**
 * Converts the given base64 skylink to base32.
 *
 * @param skylink - The base64 skylink.
 * @returns - The converted base32 skylink.
 */
export function convertSkylinkToBase32(skylink: string): string {
  skylink = trimUriPrefix(skylink, uriSkynetPrefix);
  validateStringLen("skylink", skylink, "parameter", BASE64_ENCODED_SKYLINK_SIZE);

  const bytes = decodeSkylinkBase64(skylink);
  return encodeSkylinkBase32(bytes);
}

/**
 * Converts the given base32 skylink to base64.
 *
 * @param skylink - The base32 skylink.
 * @returns - The converted base64 skylink.
 */
export function convertSkylinkToBase64(skylink: string): string {
  skylink = trimUriPrefix(skylink, uriSkynetPrefix);
  validateStringLen("skylink", skylink, "parameter", BASE32_ENCODED_SKYLINK_SIZE);

  const bytes = decodeSkylinkBase32(skylink);
  return encodeSkylinkBase64(bytes);
}

/**
 * Formats the skylink by adding the sia: prefix.
 *
 * @param skylink - The skylink.
 * @returns - The formatted skylink.
 */
export function formatSkylink(skylink: string): string {
  if (skylink === "") {
    return skylink;
  }
  if (!skylink.startsWith(uriSkynetPrefix)) {
    skylink = `${uriSkynetPrefix}${skylink}`;
  }
  return skylink;
}
