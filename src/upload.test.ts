/* eslint-disable @typescript-eslint/no-non-null-assertion */

import axios from "axios";
import MockAdapter from "axios-mock-adapter";

import { SkynetClient, DEFAULT_SKYNET_PORTAL_URL, URI_SKYNET_PREFIX } from "./index";
import { compareFormData } from "../utils/testing";
import { splitSizeIntoChunkAlignedParts, TUS_CHUNK_SIZE } from "./upload";

const portalUrl = DEFAULT_SKYNET_PORTAL_URL;
const client = new SkynetClient(portalUrl);
const skylink = "XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg";
const sialink = `${URI_SKYNET_PREFIX}${skylink}`;
const merkleroot = "QAf9Q7dBSbMarLvyeE6HTQmwhr7RX9VMrP9xIMzpU3I";
const bitfield = 2048;
const data = { skylink, merkleroot, bitfield };
let mock: MockAdapter;

describe("uploadFile", () => {
  const url = `${portalUrl}/skynet/skyfile`;
  const filename = "bar.txt";
  const file = new File(["foo"], filename, {
    type: "text/plain",
  });

  beforeEach(() => {
    mock = new MockAdapter(axios);
    mock.onPost(url).replyOnce(200, data);
    mock.onHead(portalUrl).replyOnce(200, {}, { "skynet-portal-api": portalUrl });
    mock.resetHistory();
  });

  it("should send formdata with file", async () => {
    const data = await client.uploadFile(file);

    expect(mock.history.post.length).toBe(1);
    const request = mock.history.post[0];

    await compareFormData(request.data, [["file", "foo", filename]]);

    expect(data.skylink).toEqual(sialink);
  });

  it("should set 'credentials' to 'include'", async () => {
    await client.uploadFile(file);

    expect(mock.history.post.length).toBe(1);
    const request = mock.history.post[0];
    expect(request.withCredentials).toBeTruthy();
  });

  it("should register onUploadProgress callback if defined", async () => {
    mock.onPost(url).reply(200, data);

    // Assert `onUploadProgress` is not defined if not set.
    await client.uploadFile(file);
    expect(mock.history.post.length).toBe(1);
    const request1 = mock.history.post[0];
    expect(request1.onUploadProgress).not.toBeDefined();

    // Assert `onUploadProgress` is defined when passed as an option.
    await client.uploadFile(file, { onUploadProgress: jest.fn() });
    expect(mock.history.post.length).toBe(2);
    const request2 = mock.history.post[1];
    expect(request2.onUploadProgress).toBeDefined();
  });

  it("should use custom filename if provided", async () => {
    const customFilename = "testname";

    const data = await client.uploadFile(file, { customFilename });
    expect(mock.history.post.length).toBe(1);
    const request = mock.history.post[0];
    await compareFormData(request.data, [["file", "foo", customFilename]]);
    expect(data.skylink).toEqual(sialink);
  });

  it("should send base-64 authentication password if provided", async () => {
    const data = await client.uploadFile(file, { APIKey: "foo", skynetApiKey: "bar" });

    expect(mock.history.post.length).toBe(1);
    const request = mock.history.post[0];

    expect(request.auth).toEqual({ username: "", password: "foo" });
    expect(request.headers).toEqual(expect.objectContaining({ "Skynet-Api-Key": "bar" }));
    await compareFormData(request.data, [["file", "foo", filename]]);

    expect(data.skylink).toEqual(sialink);
  });

  it("should send portal's custom user agent and cookie if defined", async () => {
    const client = new SkynetClient(portalUrl, { customUserAgent: "Sia-Agent", customCookie: "foo" });

    const data = await client.uploadFile(file);

    expect(mock.history.post.length).toBe(1);
    const request = mock.history.post[0];

    expect(request.headers!["User-Agent"]).toEqual("Sia-Agent");
    expect(request.headers!["Cookie"]).toEqual("foo");
    // Check that other headers weren't altered.
    expect(request.headers!["Content-Type"]).toEqual("application/x-www-form-urlencoded");
    await compareFormData(request.data, [["file", "foo", filename]]);

    expect(data.skylink).toEqual(sialink);
  });

  it("Should use user agent set in options passed to function", async () => {
    const client = new SkynetClient(portalUrl, { customUserAgent: "Sia-Agent" });

    const data = await client.uploadFile(file, { customUserAgent: "Sia-Agent-2" });

    expect(mock.history.post.length).toBe(1);
    const request = mock.history.post[0];

    expect(request.headers!["User-Agent"]).toEqual("Sia-Agent-2");
    // Check that other headers weren't altered.
    expect(request.headers!["Content-Type"]).toEqual("application/x-www-form-urlencoded");
    await compareFormData(request.data, [["file", "foo", filename]]);

    expect(data.skylink).toEqual(sialink);
  });

  it("Trying to upload with a skykey should throw an error", async () => {
    // @ts-expect-error we only check this use case in case someone ignores typescript typing
    await expect(client.uploadFile(file, { skykeyName: "test" })).rejects.toThrow(
      "Object parameter 'customOptions' contains unexpected property 'skykeyName'"
    );

    // @ts-expect-error we only check this use case in case someone ignores typescript typing
    await expect(client.uploadFile(file, { skykeyId: "test" })).rejects.toThrow(
      "Object parameter 'customOptions' contains unexpected property 'skykeyId'"
    );
  });

  it("should throw if 'file' input is not a file", async () => {
    mock.resetHandlers();

    // @ts-expect-error we only check this use case in case someone ignores typescript typing
    await expect(client.uploadFile("some/path/file.json")).rejects.toThrowError(
      "Expected parameter 'file' to be type 'File', was type 'string', value 'some/path/file.json'"
    );
  });

  it("should throw if a skylink was not returned", async () => {
    mock.resetHandlers();
    mock.onPost(url).replyOnce(200, {});

    await expect(client.uploadFile(file)).rejects.toThrowError(
      "Did not get a complete upload response despite a successful request. Please try again and report this issue to the devs if it persists. Error: Expected upload response field 'skylink' to be type 'string', was type 'undefined'"
    );
  });

  it("should throw if no data was returned to uploadFile", async () => {
    mock.resetHandlers();
    mock.onPost(url).replyOnce(200);

    await expect(client.uploadFile(file)).rejects.toThrowError(
      "Did not get a complete upload response despite a successful request. Please try again and report this issue to the devs if it persists. Error: response.data field missing"
    );
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
    mock = new MockAdapter(axios);
    mock.onPost(url).replyOnce(200, data);
    mock.onHead(portalUrl).replyOnce(200, {}, { "skynet-portal-api": portalUrl });
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

    expect(data.skylink).toEqual(sialink);
  });

  it("should register onUploadProgress callback if defined", async () => {
    mock.onPost(url).reply(200, data);

    // Assert `onUploadProgress` is not defined if not set.
    await client.uploadDirectory(directory, filename);
    expect(mock.history.post.length).toBe(1);
    const request1 = mock.history.post[0];
    expect(request1.onUploadProgress).not.toBeDefined();

    // Assert `onUploadProgress` is defined when passed as an option.
    await client.uploadDirectory(directory, filename, { onUploadProgress: jest.fn() });
    expect(mock.history.post.length).toBe(2);
    const request2 = mock.history.post[1];
    expect(request2.onUploadProgress).toBeDefined();
  });

  it("should send errorpages if given", async () => {
    mock.resetHandlers();
    mock.onPost().replyOnce(200, data);

    const errorPages = { 404: "404.html", 500: "500.html" };
    // Percent-encoding for `{"404":"404.html","500":"500.html"}`.
    const encodedJSON = "%7B%22404%22%3A%22404.html%22%2C%22500%22%3A%22500.html%22%7D";

    await client.uploadDirectory(directory, filename, { errorPages });

    expect(mock.history.post.length).toBe(1);
    expect(mock.history.post[0].url).toContain(`errorpages=${encodedJSON}`);
  });

  it("should send tryfiles if given", async () => {
    mock.resetHandlers();
    mock.onPost().replyOnce(200, data);

    const tryFiles = ["foo", "bar"];
    // Percent-encoding for `["foo","bar"]`.
    const encodedArray = "%5B%22foo%22%2C%22bar%22%5D";

    await client.uploadDirectory(directory, filename, { tryFiles });

    expect(mock.history.post.length).toBe(1);
    expect(mock.history.post[0].url).toContain(`tryfiles=${encodedArray}`);
  });

  it("should encode special characters in the URL", async () => {
    const filename = "encoding?test";
    const url = `${portalUrl}/skynet/skyfile?filename=encoding%3Ftest`;
    mock.resetHandlers();
    mock.onPost(url).replyOnce(200, data);

    const response = await client.uploadDirectory(directory, filename);

    expect(mock.history.post.length).toBe(1);

    expect(response.skylink).toEqual(sialink);
  });

  it("should throw if a skylink was not returned", async () => {
    mock.resetHandlers();
    mock.onPost(url).replyOnce(200, {});

    await expect(client.uploadDirectory(directory, filename)).rejects.toThrowError(
      "Did not get a complete upload response despite a successful request. Please try again and report this issue to the devs if it persists."
    );
  });
});

describe("splitSizeIntoChunkAlignedParts", () => {
  const mib = 1 << 20;
  const chunk = TUS_CHUNK_SIZE;
  const sizesAndChunks: Array<[number, number, number, { start: number; end: number }[]]> = [
    [
      40 * mib,
      2,
      chunk,
      [
        { start: 0, end: 40 * mib },
        { start: 40 * mib, end: 40 * mib },
      ],
    ],
    [
      40 * mib,
      3,
      chunk,
      [
        { start: 0, end: 40 * mib },
        { start: 40 * mib, end: 40 * mib },
        { start: 40 * mib, end: 40 * mib },
      ],
    ],
    [
      41 * mib,
      2,
      chunk,
      [
        { start: 0, end: 40 * mib },
        { start: 40 * mib, end: 41 * mib },
      ],
    ],
    [
      80 * mib,
      2,
      chunk,
      [
        { start: 0, end: 40 * mib },
        { start: 40 * mib, end: 80 * mib },
      ],
    ],
    [
      50 * mib,
      2,
      chunk,
      [
        { start: 0, end: 40 * mib },
        { start: 40 * mib, end: 50 * mib },
      ],
    ],
    [
      100 * mib,
      2,
      chunk,
      [
        { start: 0, end: 40 * mib },
        { start: 40 * mib, end: 100 * mib },
      ],
    ],
    [
      50 * mib,
      3,
      chunk,
      [
        { start: 0, end: 40 * mib },
        { start: 40 * mib, end: 50 * mib },
        { start: 50 * mib, end: 50 * mib },
      ],
    ],
    [
      100 * mib,
      3,
      chunk,
      [
        { start: 0, end: 40 * mib },
        { start: 40 * mib, end: 80 * mib },
        { start: 80 * mib, end: 100 * mib },
      ],
    ],
    [
      500 * mib,
      6,
      chunk,
      [
        { start: 0 * mib, end: 80 * mib },
        { start: 80 * mib, end: 160 * mib },
        { start: 160 * mib, end: 240 * mib },
        { start: 240 * mib, end: 320 * mib },
        { start: 320 * mib, end: 400 * mib },
        { start: 400 * mib, end: 500 * mib },
      ],
    ],

    // Use larger chunk size.
    [
      40 * mib,
      2,
      chunk * 2,
      [
        { start: 0, end: 40 * mib },
        { start: 40 * mib, end: 40 * mib },
      ],
    ],
    [
      40 * mib,
      3,
      chunk * 3,
      [
        { start: 0, end: 40 * mib },
        { start: 40 * mib, end: 40 * mib },
        { start: 40 * mib, end: 40 * mib },
      ],
    ],
    [
      41 * mib,
      2,
      chunk * 2,
      [
        { start: 0, end: 40 * mib },
        { start: 40 * mib, end: 41 * mib },
      ],
    ],
    [
      80 * mib,
      2,
      chunk * 2,
      [
        { start: 0, end: 80 * mib },
        { start: 80 * mib, end: 80 * mib },
      ],
    ],
    [
      81 * mib,
      2,
      chunk * 2,
      [
        { start: 0, end: 80 * mib },
        { start: 80 * mib, end: 81 * mib },
      ],
    ],
  ];

  it.each(sizesAndChunks)("('%s', '%s', '%s')", (totalSize, partCount, chunkSize, expectedParts) => {
    const parts = splitSizeIntoChunkAlignedParts(totalSize, partCount, chunkSize);
    expect(parts).toEqual(expectedParts);
  });
});
