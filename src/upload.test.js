import axios from "axios";
import MockAdapter from "axios-mock-adapter";

import { SkynetClient, defaultSkynetPortalUrl } from "./index";
import { compareFormData } from "./test_utils.js";

const mock = new MockAdapter(axios);

const portalUrl = defaultSkynetPortalUrl;
const client = new SkynetClient(portalUrl);
const skylink = "XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg";

describe("uploadFile", () => {
  const url = `${portalUrl}/skynet/skyfile`;
  const filename = "bar.txt";
  const file = new File(["foo"], filename, {
    type: "text/plain",
  });

  beforeEach(() => {
    mock.onPost(url).reply(200, { skylink: skylink });
    mock.resetHistory();
  });

  it("should send formdata with file", async () => {
    const data = await client.upload(file);

    expect(mock.history.post.length).toBe(1);
    const request = mock.history.post[0];

    await compareFormData(request.data, [["file", "foo", filename]]);

    expect(data).toEqual({ skylink });
  });

  it("should send register onUploadProgress callback if defined", async () => {
    const newPortal = "https://my-portal.net";
    const url = `${newPortal}/skynet/skyfile`;
    const client = new SkynetClient(newPortal);

    // Use replyOnce to catch a single request with the new URL.
    mock.onPost(url).replyOnce(200, { skylink: skylink });

    const data = await client.upload(file, { onUploadProgress: jest.fn() });

    expect(mock.history.post.length).toBe(1);
    const request = mock.history.post[0];

    expect(request.onUploadProgress).toEqual(expect.any(Function));
    await compareFormData(request.data, [["file", "foo", filename]]);

    expect(data).toEqual({ skylink });
  });

  it("should use custom filename if provided", async () => {
    const data = await client.upload(file, { customFilename: "testname" });

    expect(mock.history.post.length).toBe(1);
    const request = mock.history.post[0];

    await compareFormData(request.data, [["file", "foo", "testname"]]);

    expect(data).toEqual({ skylink });
  });

  it("should send base-64 authentication password if provided", async () => {
    const data = await client.upload(file, { APIKey: "foobar" });

    expect(mock.history.post.length).toBe(1);
    const request = mock.history.post[0];

    expect(request.auth).toEqual({ username: "", password: "foobar" });
    await compareFormData(request.data, [["file", "foo", filename]]);

    expect(data).toEqual({ skylink });
  });

  it("should send custom user agent if defined", async () => {
    const client = new SkynetClient(portalUrl, { customUserAgent: "Sia-Agent" });

    const data = await client.upload(file);

    expect(mock.history.post.length).toBe(1);
    const request = mock.history.post[0];

    expect(request.headers["User-Agent"]).toEqual("Sia-Agent");
    // Check that other headers weren't altered.
    expect(request.headers["Content-Type"]).toEqual("application/x-www-form-urlencoded");
    await compareFormData(request.data, [["file", "foo", filename]]);

    expect(data).toEqual({ skylink });
  });

  it("Should use user agent set in options to function", async () => {
    const client = new SkynetClient(portalUrl, { customUserAgent: "Sia-Agent" });

    const data = await client.upload(file, { customUserAgent: "Sia-Agent-2" });

    expect(mock.history.post.length).toBe(1);
    const request = mock.history.post[0];

    expect(request.headers["User-Agent"]).toEqual("Sia-Agent-2");
    // Check that other headers weren't altered.
    expect(request.headers["Content-Type"]).toEqual("application/x-www-form-urlencoded");
    await compareFormData(request.data, [["file", "foo", filename]]);

    expect(data).toEqual({ skylink });
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

  beforeEach(() => {
    mock.onPost(url).reply(200, { skylink: skylink });
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

    expect(data).toEqual({ skylink });
  });

  it("should send register onUploadProgress callback if defined", async () => {
    const data = await client.uploadDirectory(directory, filename, { onUploadProgress: jest.fn() });

    expect(mock.history.post.length).toBe(1);
    const request = mock.history.post[0];

    expect(request.onUploadProgress).toEqual(expect.any(Function));

    expect(data).toEqual({ skylink });
  });
});
