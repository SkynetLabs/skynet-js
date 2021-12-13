import { AxiosError } from "axios";

export class ExecuteRequestError extends Error {
  originalError: AxiosError;
  responseStatus: number | null;
  responseMessage: string | null;

  constructor(message: string, axiosError: AxiosError, responseStatus: number | null, responseMessage: string | null) {
    super(message);
    this.originalError = axiosError;
    this.responseStatus = responseStatus;
    this.responseMessage = responseMessage;

    // Required for `instanceof` to work.
    Object.setPrototypeOf(this, ExecuteRequestError.prototype);
  }

  /**
   * Gets the full, descriptive error response returned from skyd on the portal.
   *
   * @param err - The Axios error.
   * @returns - A new error if the error response is malformed, or the skyd error message otherwise.
   */
  static From(err: AxiosError): ExecuteRequestError {
    /* istanbul ignore next */
    if (!err.response) {
      return new ExecuteRequestError(`Error repsonse did not contain expected field 'response'.`, err, null, null);
    }
    /* istanbul ignore next */
    if (!err.response.status) {
      return new ExecuteRequestError(
        `Error response did not contain expected field 'response.status'.`,
        err,
        null,
        null
      );
    }

    const status = err.response.status;

    // If we don't get an error message from skyd, just return the status code.
    /* istanbul ignore next */
    if (!err.response.data) {
      return new ExecuteRequestError(`Request failed with status code ${status}`, err, status, null);
    }
    /* istanbul ignore next */
    if (!err.response.data.message) {
      return new ExecuteRequestError(`Request failed with status code ${status}`, err, status, null);
    }

    // Return the error message from skyd. Pass along the original Axios error.
    return new ExecuteRequestError(
      `Request failed with status code ${err.response.status}: ${err.response.data.message}`,
      err,
      status,
      err.response.data.message
    );
  }
}
