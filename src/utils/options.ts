import { CustomClientOptions } from "../client";

/**
 * Base custom options for methods hitting the API.
 */
export type BaseCustomOptions = CustomClientOptions;

/**
 * The default base custom options.
 */
export const defaultBaseOptions = {
  APIKey: "",
  customUserAgent: "",
  onUploadProgress: undefined,
};

/**
 * Extract only the base custom options from the given options.
 *
 * @param opts - The given options.
 * @returns - The extracted base custom options.
 */
export function extractBaseCustomOptions(opts: Record<string, unknown>): BaseCustomOptions {
  // @ts-expect-error - We can't ensure the correct types here.
  return (({ APIKey, customUserAgent, onUploadProgress }) => ({
    APIKey,
    customUserAgent,
    onUploadProgress,
  }))(opts);
}
