import base64 from "base64-js";
import base32Encode from "base32-encode";
import { uriSkynetPrefix } from "../utils/url";

/**
 * Converts the given base64 skylink to base32.
 *
 * @param skylink - The base64 skylink.
 * @returns - The converted base32 skylink.
 */
export function convertSkylinkToBase32(skylink: string): string {
  const decoded = base64.toByteArray(skylink.padEnd(skylink.length + 4 - (skylink.length % 4), "="));
  return base32Encode(decoded, "RFC4648-HEX", { padding: false }).toLowerCase();
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
