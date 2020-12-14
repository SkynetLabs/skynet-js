import axios from "axios";
import MockAdapter from "axios-mock-adapter";

import { SkynetClient, defaultSkynetPortalUrl, uriSkynetPrefix } from "./index";
import { compareFormData } from "../utils/testing";

const portalUrl = defaultSkynetPortalUrl;
const client = new SkynetClient(portalUrl);
const skylink = "XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg";
const sialink = `${uriSkynetPrefix}${skylink}`;

describe("uploadFile", () => {
  const url = `${portalUrl}/skynet/skyfile`;
  const filename = "bar.txt";
  const file = new File(["foo"], filename, {
    type: "text/plain",
  });
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    mock.onPost(url).replyOnce(200, { skylink });
    mock.resetHistory();
  });

  it("should send formdata with file", async () => {
    const data = await client.uploadFile(file);

    expect(mock.history.post.length).toBe(1);
    const request = mock.history.post[0];

    await compareFormData(request.data, [["file", "foo", filename]]);

    expect(data).toEqual(sialink);
  });

  it("should send register onUploadProgress callback if defined", async () => {
    const newPortal = "https://my-portal.net";
    const url = `${newPortal}/skynet/skyfile`;
    const client = new SkynetClient(newPortal);

    // Use replyOnce to catch a single request with the new URL.
    mock.onPost(url).replyOnce(200, { skylink });

    const data = await client.uploadFile(file, { onUploadProgress: jest.fn() });

    expect(mock.history.post.length).toBe(1);
    const request = mock.history.post[0];

    expect(request.onUploadProgress).toEqual(expect.any(Function));
    await compareFormData(request.data, [["file", "foo", filename]]);

    expect(data).toEqual(sialink);
  });

  it("should use custom filename if provided", async () => {
    const data = await client.uploadFile(file, { customFilename: "testname" });

    expect(mock.history.post.length).toBe(1);
    const request = mock.history.post[0];

    await compareFormData(request.data, [["file", "foo", "testname"]]);

    expect(data).toEqual(sialink);
  });

  it("should send base-64 authentication password if provided", async () => {
    const data = await client.uploadFile(file, { APIKey: "foobar" });

    expect(mock.history.post.length).toBe(1);
    const request = mock.history.post[0];

    expect(request.auth).toEqual({ username: "", password: "foobar" });
    await compareFormData(request.data, [["file", "foo", filename]]);

    expect(data).toEqual(sialink);
  });

  it("should send portal's custom user agent if defined", async () => {
    const client = new SkynetClient(portalUrl, { customUserAgent: "Sia-Agent" });

    const data = await client.uploadFile(file);

    expect(mock.history.post.length).toBe(1);
    const request = mock.history.post[0];

    expect(request.headers["User-Agent"]).toEqual("Sia-Agent");
    // Check that other headers weren't altered.
    expect(request.headers["Content-Type"]).toEqual("application/x-www-form-urlencoded");
    await compareFormData(request.data, [["file", "foo", filename]]);

    expect(data).toEqual(sialink);
  });

  it("Should use user agent set in options passed to function", async () => {
    const client = new SkynetClient(portalUrl, { customUserAgent: "Sia-Agent" });

    const data = await client.uploadFile(file, { customUserAgent: "Sia-Agent-2" });

    expect(mock.history.post.length).toBe(1);
    const request = mock.history.post[0];

    expect(request.headers["User-Agent"]).toEqual("Sia-Agent-2");
    // Check that other headers weren't altered.
    expect(request.headers["Content-Type"]).toEqual("application/x-www-form-urlencoded");
    await compareFormData(request.data, [["file", "foo", filename]]);

    expect(data).toEqual(sialink);
  });

  it("Should send custom query parameters if provided", async () => {
    // Create a client with a unique portal so we don't accidentally hit another
    // request mocker.
    const portalUrl = "https://portal.net";
    const url = `${portalUrl}/skynet/skyfile`;
    const client = new SkynetClient(portalUrl, { customUserAgent: "Sia-Agent" });

    mock.onPost(`${url}?file=test`).replyOnce(200, { skylink });

    const query = { file: "test" };
    const data = await client.uploadFile(file, { query });

    expect(data).toEqual(sialink);
  });

  it("Trying to upload with a skykey should throw an error", async () => {
    // @ts-expect-error we only check this use case in case someone ignores typescript typing
    await expect(client.uploadFile(file, { skykeyName: "test" })).rejects.toThrow();

    // @ts-expect-error we only check this use case in case someone ignores typescript typing
    await expect(client.uploadFile(file, { skykeyId: "test" })).rejects.toThrow();
  });

  it("should throw if a skylink was not returned", async () => {
    mock.resetHandlers();
    mock.onPost(url).replyOnce(200, {});

    await expect(client.uploadFile(file)).rejects.toThrowError("Did not get expected skylink response");
  });
});

describe("uploadDirectory", () => {
  const filename = "i-am-root";
  const directory = {
    "i-am-not/file1.jpeg": new File(["foo1"], "i-am-not/file1.jpeg"),
    "i-am-not/file2.jpeg": new File(["foo2"], "i-am-not/file2.jpeg"),
    "i-am-not/me-neither/file3.jpeg": new File(["foo3"], "i-am-not/me-neither/file3.jpeg"),
  };
  const url = `${portalUrl}/skynet/skyfile?filename=${filename}`;
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    mock.onPost(url).replyOnce(200, { skylink });
    mock.resetHistory();
  });

  it("should send formdata with files", async () => {
    const data = await client.uploadDirectory(directory, filename);

    expect(mock.history.post.length).toBe(1);
    const request = mock.history.post[0];

    await compareFormData(request.data, [
      ["files[]", "foo1", "i-am-not/file1.jpeg"],
      ["files[]", "foo2", "i-am-not/file2.jpeg"],
      ["files[]", "foo3", "i-am-not/me-neither/file3.jpeg"],
    ]);

    expect(data).toEqual(sialink);
  });

  it("should send register onUploadProgress callback if defined", async () => {
    const data = await client.uploadDirectory(directory, filename, { onUploadProgress: jest.fn() });

    expect(mock.history.post.length).toBe(1);
    const request = mock.history.post[0];

    expect(request.onUploadProgress).toEqual(expect.any(Function));

    expect(data).toEqual(sialink);
  });

  it("should encode special characters in the URL", async () => {
    const filename = "encoding?test";
    const url = `${portalUrl}/skynet/skyfile?filename=encoding%3Ftest`;
    mock.resetHandlers();
    mock.onPost(url).replyOnce(200, { skylink });

    const data = await client.uploadDirectory(directory, filename);

    expect(mock.history.post.length).toBe(1);

    expect(data).toEqual(sialink);
  });
});
