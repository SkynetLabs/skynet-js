import { CustomClientOptions } from "../client";

/**
 * Base custom options for methods hitting the API.
 *
 * @property [endpointPath] - The relative URL path of the portal endpoint to contact.
 */
export type BaseCustomOptions = CustomClientOptions & {
  endpointPath?: string;
};

/**
 * Returns the default base custom options for the given endpoint path.
 *
 * @param endpointPath - The endpoint path.
 * @returns - The base custom options.
 */
export function defaultOptions(endpointPath: string): CustomClientOptions & { endpointPath: string } {
  return {
    endpointPath,
    APIKey: "",
    customUserAgent: "",
  };
}
