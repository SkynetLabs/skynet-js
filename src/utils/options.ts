import { CustomClientOptions } from "../client";

/**
 * Base custom options for methods hitting the API.
 *
 * @property [endpointPath] - The relative URL path of the portal endpoint to contact.
 * @property [query] - Query parameters.
 */
export type BaseCustomOptions = CustomClientOptions & {
  endpointPath?: string;
  query?: Record<string, unknown>;
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
