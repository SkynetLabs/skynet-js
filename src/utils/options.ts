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
 * Extract only the model's custom options from the given options.
 *
 * @param opts - The given options.
 * @param model - The model options.
 * @returns - The extracted custom options.
 */
export function extractOptions<T extends Record<string, unknown>>(opts: Record<string, unknown>, model: T): T {
  const result: Record<string, unknown> = {};
  for (const property in model) {
    if (Object.prototype.hasOwnProperty.call(model, property)) {
      result[property] = opts[property];
    }
  }

  return result as T;
}
