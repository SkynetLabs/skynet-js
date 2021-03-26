export function extractResponseError(err: any): Error {
  /* istanbul ignore next */
  if (!err.response) {
    console.log(`Full error: ${err}`);
    throw new Error("Error response not found");
  }
  /* istanbul ignore next */
  if (!err.response.data) {
    console.log(`Full error: ${err}`);
    return new Error(`Error response did not contain expected field 'data'. Status code: ${err.response.status}`);
  }
  /* istanbul ignore next */
  if (!err.response.data.message) {
    console.log(`Full error: ${err}`);
    return new Error(
      `Error response did not contained expected fields 'data.message'. Status code: ${err.response.status}`
    );
  }
  // Return the error message from the response.
  return new Error(err.response.data.message);
}
