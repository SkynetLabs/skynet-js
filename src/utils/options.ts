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
  customCookie: "",
  onUploadProgress: undefined,
};

/**
 * Extract only the model's custom options from the given options.
 *
 * @param opts - The given options.
 * @param model - The model options.
 * @returns - The extracted custom options.
 * @throws - If the given opts don't contain all properties of the model.
 */
export function extractOptions<T extends Record<string, unknown>>(opts: Record<string, unknown>, model: T): T {
  const result: Record<string, unknown> = {};
  for (const property in model) {
    /* istanbul ignore next */
    if (!Object.prototype.hasOwnProperty.call(model, property)) {
      continue;
    }
    // Throw if the given options don't contain the model's property.
    if (!Object.prototype.hasOwnProperty.call(opts, property)) {
      throw new Error(`Property '${property}' not found`);
    }
    result[property] = opts[property];
  }

  return result as T;
}
