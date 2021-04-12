import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { combineStrings, extractNonSkylinkPath } from "../utils/testing";

import { SkynetClient, defaultSkynetPortalUrl, uriSkynetPrefix } from "./index";
import { getSkylinkUrlForPortal } from "./utils/url";

const portalUrl = defaultSkynetPortalUrl;
const hnsLink = "foo";
const client = new SkynetClient(portalUrl);
const skylink = "XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg";
const skylinkBase32 = "bg06v2tidkir84hg0s1s4t97jaeoaa1jse1svrad657u070c9calq4g";
const skylinkUrl = getSkylinkUrlForPortal(portalUrl, skylink);
const sialink = `${uriSkynetPrefix}${skylink}`;

const validSkylinkVariations = combineStrings(
  ["", "sia:", "sia://", "https://siasky.net/", "https://foo.siasky.net/", `https://${skylinkBase32}.siasky.net/`],
  [skylink],
  ["", "/", "//", "/foo", "/foo/", "/foo/bar", "/foo/bar/", "/foo/bar//"],
  ["", "?", "?foo=bar", "?foo=bar&bar=baz"],
  ["", "#", "#foo", "#foo?bar"]
);
const validHnsLinkVariations = [hnsLink, `hns:${hnsLink}`, `hns://${hnsLink}`];
const validHnsresLinkVariations = [hnsLink, `hnsres:${hnsLink}`, `hnsres://${hnsLink}`];

const attachment = "?attachment=true";
const expectedUrl = `${portalUrl}/${skylink}`;
const expectedHnsUrl = `${portalUrl}/hns/${hnsLink}`;
const expectedHnsUrlSubdomain = `https://${hnsLink}.hns.siasky.net`;
const expectedHnsresUrl = `${portalUrl}/hnsres/${hnsLink}`;

const mockLocationAssign = jest.fn();
Object.defineProperty(window, "location", {
  value: {
    assign: mockLocationAssign,
  },
  writable: true,
});

describe("downloadFile", () => {
  it.each(validSkylinkVariations)("should download with attachment set from skylink %s", async (fullSkylink) => {
    mockLocationAssign.mockClear();
    const url = await client.downloadFile(fullSkylink);

    const path = extractNonSkylinkPath(fullSkylink, skylink);

    let fullExpectedUrl = `${expectedUrl}${path}${attachment}`;
    // Change ?attachment=true to &attachment=true if need be.
    if ((fullExpectedUrl.match(/\?/g) || []).length > 1) {
      fullExpectedUrl = fullExpectedUrl.replace(attachment, "&attachment=true");
    }

    expect(url).toEqual(fullExpectedUrl);
    expect(mockLocationAssign).toHaveBeenCalledWith(fullExpectedUrl);
  });

  it("should download with the optional path being correctly URI-encoded", async () => {
    const url = await client.downloadFile(skylink, { path: "dir/test?encoding" });

    expect(url).toEqual(`${expectedUrl}/dir/test%3Fencoding${attachment}`);
  });

  it("should download with query parameters being appended to the URL", async () => {
    const url = await client.downloadFile(skylink, { query: { name: "test" } });

    expect(url).toEqual(`${expectedUrl}?name=test&attachment=true`);
  });
});

describe("downloadFileHns", () => {
  it.each(validHnsLinkVariations)("should download with the correct link using hns link %s", async (input) => {
    const url = await client.downloadFileHns(input);

    expect(url).toEqual(`${expectedHnsUrl}${attachment}`);
  });
});

describe("getHnsUrl", () => {
  it.each(validHnsLinkVariations)("should return correctly formed hns URL using hns link %s", async (input) => {
    expect(await client.getHnsUrl(input)).toEqual(expectedHnsUrl);
    expect(await client.getHnsUrl(input, { subdomain: true })).toEqual(expectedHnsUrlSubdomain);
  });

  it("should return correctly formed hns URL with forced download", async () => {
    const url = await client.getHnsUrl(hnsLink, { download: true });

    expect(url).toEqual(`${expectedHnsUrl}${attachment}`);
  });

  it("should return correctly formed hns URL with no-response-metadata set", async () => {
    const url = await client.getHnsUrl(hnsLink, { noResponseMetadata: true });

    expect(url).toEqual(`${expectedHnsUrl}?no-response-metadata=true`);
  });
});

describe("getHnsresUrl", () => {
  it.each(validHnsresLinkVariations)(
    "should return correctly formed hnsres URL using hnsres link %s",
    async (input) => {
      expect(await client.getHnsresUrl(input)).toEqual(expectedHnsresUrl);
    }
  );
});

describe("getSkylinkUrl", () => {
  const expectedUrl = `${portalUrl}/${skylink}`;

  it.each(validSkylinkVariations)(
    "should return correctly formed skylink URL using skylink %s",
    async (fullSkylink) => {
      const path = extractNonSkylinkPath(fullSkylink, skylink);

      expect(await client.getSkylinkUrl(fullSkylink)).toEqual(`${expectedUrl}${path}`);
    }
  );

  it("should return correctly formed URLs when path is given", async () => {
    expect(await client.getSkylinkUrl(skylink, { path: "foo/bar" })).toEqual(`${expectedUrl}/foo/bar`);
    expect(await client.getSkylinkUrl(skylink, { path: "foo?bar" })).toEqual(`${expectedUrl}/foo%3Fbar`);
  });

  it("should return correctly formed URL with forced download", async () => {
    const url = await client.getSkylinkUrl(skylink, { download: true, endpointDownload: "skynet/skylink" });

    expect(url).toEqual(`${portalUrl}/skynet/skylink/${skylink}${attachment}`);
  });

  it("should return correctly formed URLs with forced download and path", async () => {
    const url = await client.getSkylinkUrl(skylink, { download: true, path: "foo?bar" });

    expect(url).toEqual(`${expectedUrl}/foo%3Fbar${attachment}`);
  });

  it("should return correctly formed URLs with no-response-metadata set", async () => {
    const url = await client.getSkylinkUrl(skylink, { noResponseMetadata: true });

    expect(url).toEqual(`${expectedUrl}?no-response-metadata=true`);
  });

  it("should return correctly formed URLs with no-response-metadata set and with forced download", async () => {
    const url = await client.getSkylinkUrl(skylink, { download: true, noResponseMetadata: true });

    expect(url).toEqual(`${expectedUrl}?attachment=true&no-response-metadata=true`);
  });

  const expectedBase32 = `https://${skylinkBase32}.siasky.net`;

  it.each(validSkylinkVariations)("should convert base64 skylink to base32 using skylink %s", async (fullSkylink) => {
    const path = extractNonSkylinkPath(fullSkylink, skylink);
    const url = await client.getSkylinkUrl(fullSkylink, { subdomain: true });

    expect(url).toEqual(`${expectedBase32}${path}`);
  });

  it("should throw if passing a non-string path", async () => {
    // @ts-expect-error we only check this use case in case someone ignores typescript typing
    await expect(client.getSkylinkUrl(skylink, { path: true })).rejects.toThrowError(
      "opts.path has to be a string, boolean provided"
    );
  });

  const invalidCases = ["123", `${skylink}xxx`, `${skylink}xxx/foo`, `${skylink}xxx?foo`];

  it.each(invalidCases)("should throw on invalid skylink %s", async (invalidSkylink) => {
    await expect(client.getSkylinkUrl(invalidSkylink)).rejects.toThrow();
    await expect(client.getSkylinkUrl(invalidSkylink, { subdomain: true })).rejects.toThrow();
  });
});

describe("getMetadata", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    mock.onHead(portalUrl).replyOnce(200, {}, { "skynet-portal-api": portalUrl });
  });

  const skynetFileMetadata = { filename: "sia.pdf" };
  const headersFull = { "skynet-skylink": skylink, "skynet-file-metadata": JSON.stringify(skynetFileMetadata) };

  it.each(validSkylinkVariations)(
    "should successfully fetch skynet file headers from skylink %s",
    async (fullSkylink) => {
      const skylinkUrl = await client.getSkylinkUrl(fullSkylink);
      mock.onHead(skylinkUrl).replyOnce(200, {}, headersFull);

      const { metadata } = await client.getMetadata(fullSkylink);

      expect(metadata).toEqual(skynetFileMetadata);
    }
  );

  it.each(validSkylinkVariations)(
    "should quietly return nothing when skynet metadata headers not present for skylink %s",
    async (fullSkylink) => {
      const skylinkUrl = await client.getSkylinkUrl(fullSkylink);
      mock.onHead(skylinkUrl).replyOnce(200, {}, {});

      const { metadata } = await client.getMetadata(fullSkylink);

      expect(metadata).toEqual({});
    }
  );

  it("should throw if no headers were returned", async () => {
    mock.onHead(skylinkUrl).replyOnce(200, {});

    await expect(client.getMetadata(skylink)).rejects.toThrowError(
      "Did not get 'headers' in response despite a successful request. Please try again and report this issue to the devs if it persists."
    );
  });
});

describe("getFileContent", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    mock.onHead(portalUrl).replyOnce(200, {}, { "skynet-portal-api": portalUrl });
  });
  const skynetFileMetadata = { filename: "sia.pdf" };
  const skynetFileContents = { arbitrary: "json string" };
  const fullHeaders = {
    "skynet-skylink": skylink,
    "content-type": "application/json",
    "skynet-file-metadata": JSON.stringify(skynetFileMetadata),
  };

  it.each(validSkylinkVariations)("should successfully fetch skynet file content for %s", async (input) => {
    const skylinkUrl = await client.getSkylinkUrl(input);
    mock.onGet(skylinkUrl).replyOnce(200, skynetFileContents, fullHeaders);

    const { data, contentType, metadata, skylink: skylink2 } = await client.getFileContent(input);

    expect(data).toEqual(skynetFileContents);
    expect(contentType).toEqual("application/json");
    expect(metadata).toEqual(skynetFileMetadata);
    expect(skylink2).toEqual(sialink);
  });

  const headers = {};

  it.each(validSkylinkVariations)(
    "should successfully fetch skynet file content even when headers are missing for %s",
    async (input) => {
      const skylinkUrl = await client.getSkylinkUrl(input);
      mock.onGet(skylinkUrl).replyOnce(200, skynetFileContents, headers);

      const { data, contentType, metadata, skylink: skylink2 } = await client.getFileContent(input);

      expect(data).toEqual(skynetFileContents);
      expect(contentType).toEqual("");
      expect(metadata).toEqual({});
      expect(skylink2).toEqual("");
    }
  );

  it("should throw if data is not returned", async () => {
    mock.onGet(expectedUrl).replyOnce(200);

    await expect(client.getFileContent(skylink)).rejects.toThrowError(
      "Did not get 'data' in response despite a successful request. Please try again and report this issue to the devs if it persists."
    );
  });

  it("should throw if headers are not returned", async () => {
    mock.onGet(expectedUrl).replyOnce(200, {});

    await expect(client.getFileContent(skylink)).rejects.toThrowError(
      "Did not get 'headers' in response despite a successful request. Please try again and report this issue to the devs if it persists."
    );
  });
});

describe("getFileContentHns", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    mock.onHead(portalUrl).replyOnce(200, {}, { "skynet-portal-api": portalUrl });
  });

  const skynetFileContents = { arbitrary: "json string" };
  const headers = { "content-type": "application/json" };

  it.each(validHnsLinkVariations)("should successfully fetch skynet file content", async (input) => {
    const hnsUrl = await client.getHnsUrl(input);
    mock.onGet(hnsUrl).reply(200, skynetFileContents, headers);

    const { data } = await client.getFileContentHns(input);

    expect(data).toEqual(skynetFileContents);
  });
});

describe("openFile", () => {
  const windowOpen = jest.spyOn(window, "open").mockImplementation();

  it.each(validSkylinkVariations)(
    "should call window.openFile when calling openFile with skylink %s",
    async (fullSkylink) => {
      windowOpen.mockReset();

      const path = extractNonSkylinkPath(fullSkylink, skylink);
      await client.openFile(fullSkylink);

      expect(windowOpen).toHaveBeenCalledTimes(1);
      expect(windowOpen).toHaveBeenCalledWith(`${expectedUrl}${path}`, "_blank");
    }
  );
});

describe("downloadFileHns", () => {
  it.each(validHnsLinkVariations)(
    "should set domain %s with the portal and hns link and then call window.openFile with attachment set",
    async (input) => {
      mockLocationAssign.mockClear();

      await client.downloadFileHns(input);

      expect(mockLocationAssign).toHaveBeenCalledWith("https://siasky.net/hns/foo?attachment=true");
    }
  );
});

describe("openFileHns", () => {
  const hnsUrl = `${portalUrl}/hns/${hnsLink}`;
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    mock.onHead(portalUrl).replyOnce(200, {}, { "skynet-portal-api": portalUrl });
  });

  it("should set domain with the portal and hns link and then call window.openFile", async () => {
    const windowOpen = jest.spyOn(window, "open").mockImplementation();

    for (const input of validHnsLinkVariations) {
      mock.resetHistory();
      windowOpen.mockReset();

      await client.openFileHns(input);

      expect(mock.history.get.length).toBe(0);

      expect(windowOpen).toHaveBeenCalledTimes(1);
      expect(windowOpen).toHaveBeenCalledWith(hnsUrl, "_blank");
    }
  });
});

describe("resolveHns", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    mock.onHead(portalUrl).replyOnce(200, {}, { "skynet-portal-api": portalUrl });
    mock.onGet(expectedHnsresUrl).replyOnce(200, { skylink });
  });

  it.each(validHnsresLinkVariations)(
    "should call axios.get with the portal and hnsres link for %s and return the json body",
    async (hnsresLink) => {
      mock.resetHistory();

      const data = await client.resolveHns(hnsresLink);

      expect(mock.history.get.length).toBe(1);
      expect(data.skylink).toEqual(skylink);
    }
  );
});
