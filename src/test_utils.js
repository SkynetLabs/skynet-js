/**
 * Compares the provided FormData with the expected array of entries.
 * @param {Object} formData - opaque FormData to compare.
 * @param {array} entries - array of expected entries.
 */
export async function compareFormData(formData, entries) {
  let i = 0;
  for (const pair of formData.entries()) {
    const fieldName = pair[0];
    const file = pair[1];

    expect(fieldName).toEqual(entries[i][0]);

    // Read the file asynchronously.
    const reader = new FileReader();
    reader.onload = function (e) {
      // Check that the file contents equal expected entry.
      expect(e.target.result).toEqual(entries[i][1]);
    };
    reader.readAsText(file);
    while (reader.readyState != "2") {
      // Sleep for 10ms.
      await new Promise((r) => setTimeout(r, 10)); // eslint-disable-line
    }

    i++;
  }

  expect(i).toEqual(entries.length);
}
