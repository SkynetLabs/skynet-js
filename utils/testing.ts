/* istanbul ignore file: Test utils, coverage does not matter */

import parse from "url-parse";
import { trimForwardSlash } from "../src/utils/string";

/**
 * Returns a composed array with the given inputs and the expected output.
 *
 * @param inputs - The given inputs.
 * @param expected - The expected output for all the inputs.
 * @returns - The array of composed test cases.
 */
export function composeTestCases<T, U>(inputs: Array<T>, expected: U): Array<[T, U]> {
  return inputs.map((input) => [input, expected]);
}

/**
 * Returns an array of arrays of all possible permutations by picking one
 * element out of each of the input arrays.
 *
 * @param arrays - Array of arrays.
 * @returns - Array of arrays of all possible permutations.
 * @see {@link https://gist.github.com/ssippe/1f92625532eef28be6974f898efb23ef#gistcomment-3530882}
 */
export function combineArrays<T>(...arrays: Array<Array<T>>): Array<Array<T>> {
  return arrays.reduce<T[][]>(
    (accArrays, array) => accArrays.flatMap((accArray) => array.map((value) => [...accArray, value])),
    [[]]
  );
}

/**
 * Returns an array of strings of all possible permutations by picking one
 * string out of each of the input string arrays.
 *
 * @param arrays - Array of string arrays.
 * @returns - Array of strings of all possible permutations.
 */
export function combineStrings(...arrays: Array<Array<string>>): Array<string> {
  return arrays.reduce((acc, array) => acc.flatMap((first: string) => array.map((second) => first.concat(second))));
}

/**
 * Compares the provided FormData with the expected array of entries.
 *
 * @param formData - opaque FormData to compare.
 * @param entries - array of expected entries.
 */
export async function compareFormData(formData: Record<string, unknown>, entries: Array<Array<string>>): Promise<void> {
  let i = 0;
  // @ts-expect-error the following line complains no matter what type I give formData...
  for (const [fieldName, file] of formData.entries()) {
    const entry = entries[i];
    const expectedFieldName = entry[0];
    const expectedData = entry[1];
    const expectedFilename = entry[2];

    expect(fieldName).toEqual(expectedFieldName);
    // Some systems use ":" as the path delimiter.
    expect(file.name == expectedFilename || file.name.replace(":", "/") == expectedFilename);

    // Read the file asynchronously.
    const reader = new FileReader();
    reader.onload = function (e) {
      // Check that the file contents equal expected entry.
      expect(e.target?.result).toEqual(expectedData);
    };
    reader.readAsText(file);
    while (reader.readyState !== 2) {
      // Sleep for 10ms while we wait for the readyState to be DONE.
      await new Promise((r) => setTimeout(r, 10)); // eslint-disable-line
    }

    i++;
  }

  // Check that the formData contains the expected number of entries.
  expect(i).toEqual(entries.length);
}

/**
 * Extracts the non-skylink part of the path from the url.
 *
 * @param url - The input URL.
 * @param skylink - The skylink to remove, if it is present.
 * @returns - The non-skylink part of the path.
 */
export function extractNonSkylinkPath(url: string, skylink: string): string {
  const parsed = parse(url, {});
  let path = parsed.pathname.replace(skylink, ""); // Remove skylink to get the path.
  // Ensure there are no leading or trailing slashes.
  path = trimForwardSlash(path);
  // Add back the slash, unless there is no path.
  if (path !== "") {
    path = `/${path}`;
  }
  return path;
}

/**
 * Gets the settled values from `Promise.allSettled`. Throws if an error is
 * found. Returns all settled values if no errors were found.
 *
 * @param values - The settled values.
 * @returns - The settled value if no errors were found.
 * @throws - Will throw if an unexpected error occurred.
 */
export function getSettledValues<T>(values: PromiseSettledResult<T>[]): T[] {
  const receivedValues = [];

  for (const value of values) {
    if (value.status === "rejected") {
      throw value.reason;
    } else if (value.value) {
      receivedValues.push(value.value);
    }
  }

  return receivedValues;
}

/**
 * Generates a random Unicode string using the code points between 0 and 65536.
 *
 * @param length - The length of the string.
 * @returns - The string.
 */
export function randomUnicodeString(length: number): string {
  return Array.from({ length }, () => String.fromCharCode(Math.floor(Math.random() * 65536))).join("");
}
