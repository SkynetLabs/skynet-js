/**
 * Compares the provided FormData with the expected array of entries.
 * @param {Object} formData - opaque FormData to compare.
 * @param {array} entries - array of expected entries.
 */
export async function compareFormData(formData: Record<string, any>, entries: Array<any>) {
  let i = 0;
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
      expect(e.target.result).toEqual(expectedData);
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
