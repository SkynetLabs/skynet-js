import axios from "axios";
import MockAdapter from "axios-mock-adapter";

import { ExecuteRequestError, SkynetClient } from ".";
import { getSkylinkUrlForPortal } from "./download";
import { DEFAULT_SKYNET_PORTAL_URL } from "./utils/url";

const portalUrl = DEFAULT_SKYNET_PORTAL_URL;
const client = new SkynetClient(portalUrl);
const skylink = "XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg";
const skylinkUrl = getSkylinkUrlForPortal(portalUrl, skylink);

describe("ExecuteRequestError", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    mock.resetHistory();
  });

  it("should have a working instanceof and also be an axios error", async () => {
    mock.onGet(skylinkUrl).replyOnce(404);

    try {
      // Should result in a 404.
      await client.getFileContent(skylink);
      expect(true).toBeFalsy();
    } catch (err) {
      // Assert the type and that instanceof behaves as expected.
      expect(err).toBeInstanceOf(ExecuteRequestError);
      // NOTE: Backwards-compatibility check. Include this check as third-party
      // devs may be assuming the network request error is still an
      // `AxiosError`, and we don't want to break compatibility.
      expect(axios.isAxiosError(err)).toBeTruthy();
      expect((err as ExecuteRequestError).responseStatus).toEqual(404);
    }
  });

  it("should not be able to be instantiated from another ExecuteRequestError", async () => {
    mock.onGet(skylinkUrl).replyOnce(404);

    // Get an `ExecuteRequestError`.
    let error: ExecuteRequestError;
    try {
      // Should result in a 404.
      await client.getFileContent(skylink);
      expect(true).toBeFalsy();
    } catch (err) {
      error = err as ExecuteRequestError;
    }

    // Should not be able to instantiate an `ExecuteRequestError` from another
    // `ExecuteRequestError`.
    expect(() => ExecuteRequestError.From(error)).toThrowError(
      "Could not instantiate an `ExecuteRequestError` from an `ExecuteRequestError`, an original error from axios was expected"
    );
  });
});
