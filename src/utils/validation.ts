import { isHexString } from "./string";

/**
 * Validates the given value as a bigint.
 *
 * @param name - The name of the value.
 * @param value - The actual value.
 * @param valueKind - The kind of value that is being checked (e.g. "parameter", "response field", etc.)
 * @throws - Will throw if not a valid bigint.
 */
export function validateBigint(name: string, value: unknown, valueKind: string): void {
  if (typeof value !== "bigint") {
    throwValidationError(name, value, valueKind, "type 'bigint'");
  }
}

/**
 * Validates the given value as an object.
 *
 * @param name - The name of the value.
 * @param value - The actual value.
 * @param valueKind - The kind of value that is being checked (e.g. "parameter", "response field", etc.)
 * @throws - Will throw if not a valid object.
 */
export function validateObject(name: string, value: unknown, valueKind: string): void {
  if (typeof value !== "object") {
    throwValidationError(name, value, valueKind, "type 'object'");
  }
  if (value === null) {
    throwValidationError(name, value, valueKind, "non-null");
  }
}

/**
 * Validates the given value as an optional object.
 *
 * @param name - The name of the value.
 * @param value - The actual value.
 * @param valueKind - The kind of value that is being checked (e.g. "parameter", "response field", etc.)
 * @param model - A model object that contains all possible fields. 'value' does not need to have all fields, but it may not have any fields not contained in 'model'.
 * @throws - Will throw if not a valid optional object.
 */
export function validateOptionalObject(
  name: string,
  value: unknown,
  valueKind: string,
  model: Record<string, unknown>
): void {
  if (!value) {
    // This is okay, the object is optional.
    return;
  }
  validateObject(name, value, valueKind);

  // Check if all given properties of value also exist in the model.
  for (const property in value as Record<string, unknown>) {
    if (!(property in model)) {
      throw new Error(`Object ${valueKind} '${name}' contains unexpected property '${property}'`);
    }
  }
}

/**
 * Validates the given value as a number.
 *
 * @param name - The name of the value.
 * @param value - The actual value.
 * @param valueKind - The kind of value that is being checked (e.g. "parameter", "response field", etc.)
 * @throws - Will throw if not a valid number.
 */
export function validateNumber(name: string, value: unknown, valueKind: string): void {
  if (typeof value !== "number") {
    throwValidationError(name, value, valueKind, "type 'number'");
  }
}

/**
 * Validates the given value as a string.
 *
 * @param name - The name of the value.
 * @param value - The actual value.
 * @param valueKind - The kind of value that is being checked (e.g. "parameter", "response field", etc.)
 * @throws - Will throw if not a valid string.
 */
export function validateString(name: string, value: unknown, valueKind: string): void {
  if (typeof value !== "string") {
    throwValidationError(name, value, valueKind, "type 'string'");
  }
}

/**
 * Validates the given value as a hex-encoded string.
 *
 * @param name - The name of the value.
 * @param value - The actual value.
 * @param valueKind - The kind of value that is being checked (e.g. "parameter", "response field", etc.)
 * @throws - Will throw if not a valid hex-encoded string.
 */
export function validateHexString(name: string, value: unknown, valueKind: string): void {
  validateString(name, value, valueKind);
  if (!isHexString(value as string)) {
    throwValidationError(name, value, valueKind, "a hex-encoded string");
  }
}

/**
 * Throws an error for the given value
 *
 * @param name - The name of the value.
 * @param value - The actual value.
 * @param valueKind - The kind of value that is being checked (e.g. "parameter", "response field", etc.)
 * @param expected - The expected aspect of the value that could not be validated (e.g. "type 'string'" or "non-null").
 * @throws - Will always throw.
 */
export function throwValidationError(name: string, value: unknown, valueKind: string, expected: string): void {
  throw new Error(`Expected ${valueKind} '${name}' to be ${expected}, was '${value}'`);
}
