/**
 * Returns true if the two uint8 arrays are equal. From
 * https://stackoverflow.com/a/60818105/6085242
 *
 * @param array1 - The first uint8 array.
 * @param array2 - The second uint8 array.
 * @returns - Whether the arrays are equal.
 */
export function areEqualUint8Arrays(array1: Uint8Array, array2: Uint8Array): boolean {
  if (array1.length != array2.length) {
    return false;
  }
  for (let i = 0; i < array1.length; i++) {
    if (array1[i] != array2[i]) {
      return false;
    }
  }
  return true;
}
