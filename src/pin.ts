import { AxiosResponse } from "axios";
import { SkynetClient } from "./client";
import { formatSkylink } from "./skylink/format";
import { parseSkylink } from "./skylink/parse";
import { BaseCustomOptions, DEFAULT_BASE_OPTIONS } from "./utils/options";
import { validateSkylinkString, validateString } from "./utils/validation";

/**
 * Custom pin options.
 *
 * @property [endpointPin] - The relative URL path of the portal endpoint to contact.
 */
export type CustomPinOptions = BaseCustomOptions & {
  endpointPin?: string;
};

/**
 * The response to a pin request.
 *
 * @property skylink - 46-character skylink.
 */
export type PinResponse = {
  skylink: string;
};

export const DEFAULT_PIN_OPTIONS = {
  ...DEFAULT_BASE_OPTIONS,

  endpointPin: "/skynet/pin",
};

/**
 * Re-pins the given skylink.
 *
 * @param this - SkynetClient
 * @param skylinkUrl - 46-character base64 skylink, or a valid URL that contains a skylink.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - The returned JSON and revision number.
 * @throws - Will throw if the returned signature does not match the returned entry, or if the skylink in the entry is invalid.
 */
export async function pinSkylink(
  this: SkynetClient,
  skylinkUrl: string,
  customOptions?: CustomPinOptions
): Promise<PinResponse> {
  const skylink = validateSkylinkString("skylinkUrl", skylinkUrl, "parameter");

  const opts = { ...DEFAULT_PIN_OPTIONS, ...this.customOptions, ...customOptions };

  // Don't include the path since the endpoint doesn't support it.
  const path = parseSkylink(skylinkUrl, { onlyPath: true });
  if (path) {
    throw new Error("Skylink string should not contain a path");
  }

  const response = await this.executeRequest({
    ...opts,
    endpointPath: opts.endpointPin,
    method: "post",
    extraPath: skylink,
  });

  // Sanity check.
  validatePinResponse(response);

  // Get the skylink.
  let returnedSkylink = response.headers["skynet-skylink"];

  // Format the skylink.
  returnedSkylink = formatSkylink(returnedSkylink);

  return { skylink: returnedSkylink };
}

/**
 * Validates the pin response.
 *
 * @param response - The pin response.
 * @throws - Will throw if not a valid pin response.
 */
function validatePinResponse(response: AxiosResponse): void {
  try {
    if (!response.headers) {
      throw new Error("response.headers field missing");
    }

    validateString('response.headers["skynet-skylink"]', response.headers["skynet-skylink"], "pin response field");
  } catch (err) {
    throw new Error(
      `Did not get a complete pin response despite a successful request. Please try again and report this issue to the devs if it persists. ${err}`
    );
  }
}
