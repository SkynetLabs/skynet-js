import axios from "axios";
import MockAdapter from "axios-mock-adapter";

import { SkynetClient } from ".";
import { ExecuteRequestError } from "./request";
import { defaultSkynetPortalUrl } from "./utils/url";

const portalUrl = defaultSkynetPortalUrl;
const client = new SkynetClient(portalUrl);
const skylink = "XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg";

describe("ExecuteRequestError", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    mock.resetHistory();
  });

  it("should have a working instanceof and also be an axios error", async () => {
    try {
      // Should result in a 404 as we haven't set up any mock handlers.
      await client.getFileContent(skylink);
      throw new Error("'getFileContent' should not have succeeded");
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
    // Get an `ExecuteRequestError`.
    let error: ExecuteRequestError;
    try {
      // Should result in a 404 as we haven't set up any mock handlers.
      await client.getFileContent(skylink);
      throw new Error("'getFileContent' should not have succeeded");
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
