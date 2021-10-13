import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { combineStrings, extractNonSkylinkPath } from "../utils/testing";

import { SkynetClient, defaultSkynetPortalUrl, uriSkynetPrefix } from "./index";
import { trimForwardSlash } from "./utils/string";

const portalUrl = defaultSkynetPortalUrl;
const hnsLink = "foo";
const client = new SkynetClient(portalUrl);
const skylink = "XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg";
const skylinkBase32 = "bg06v2tidkir84hg0s1s4t97jaeoaa1jse1svrad657u070c9calq4g";
const sialink = `${uriSkynetPrefix}${skylink}`;
const entryLink = "AQDwh1jnoZas9LaLHC_D4-2yP9XYDdZzNtz62H4Dww1jDA";

const validSkylinkVariations = combineStrings(
  ["", "sia:", "sia://", "https://siasky.net/", "https://foo.siasky.net/", `https://${skylinkBase32}.siasky.net/`],
  [skylink],
  ["", "/", "//", "/foo", "/foo/", "/foo/bar", "/foo/bar/", "/foo/bar//"],
  ["", "?", "?foo=bar", "?foo=bar&bar=baz"],
  ["", "#", "#foo", "#foo?bar"]
);
const validHnsLinkVariations = [hnsLink, `hns:${hnsLink}`, `hns://${hnsLink}`];

const attachment = "?attachment=true";
const expectedUrl = `${portalUrl}/${skylink}`;
const expectedEntryLinkUrl = `${portalUrl}/${entryLink}`;
const expectedHnsUrl = `https://${hnsLink}.hns.siasky.net/`;
const expectedHnsUrlNoSubdomain = `${portalUrl}/hns/${hnsLink}`;
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
});

describe("downloadFileHns", () => {
  it.each(validHnsLinkVariations)("should download with the correct link using hns link %s", async (input) => {
    const url = await client.downloadFileHns(input);

    expect(url).toEqual(`${expectedHnsUrl}${attachment}`);
  });
});

describe("getHnsUrl", () => {
  it.each(validHnsLinkVariations)(
    "should return correctly formed non-subdomain hns URL using hns link %s",
    async (input) => {
      expect(await client.getHnsUrl(input)).toEqual(expectedHnsUrl);
      expect(await client.getHnsUrl(input, { subdomain: false })).toEqual(expectedHnsUrlNoSubdomain);
    }
  );

  it("should return correctly formed hns URL with forced download", async () => {
    const url = await client.getHnsUrl(hnsLink, { download: true });

    expect(url).toEqual(`${expectedHnsUrl}${attachment}`);
  });
});

describe("getHnsresUrl", () => {
  it.each(validHnsLinkVariations)("should return correctly formed hnsres URL using hnsres link %s", async (input) => {
    expect(await client.getHnsresUrl(input)).toEqual(expectedHnsresUrl);
  });
});

describe("getSkylinkUrl", () => {
  const expectedUrl = `${portalUrl}/${skylink}`;

  it.each(validSkylinkVariations)(
    "should return correctly formed skylink URL using skylink %s",
    async (fullSkylink) => {
      const path = extractNonSkylinkPath(fullSkylink, skylink);

      let expectedPathUrl = expectedUrl;
      if (path !== "") {
        expectedPathUrl = `${expectedUrl}${path}`;
      }
      expect(await client.getSkylinkUrl(fullSkylink)).toEqual(expectedPathUrl);
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

  const expectedBase32 = `https://${skylinkBase32}.siasky.net/`;

  it.each(validSkylinkVariations)("should convert base64 skylink to base32 using skylink %s", async (fullSkylink) => {
    let path = extractNonSkylinkPath(fullSkylink, skylink);
    path = trimForwardSlash(path);
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

  const skylinkUrl = `${portalUrl}/skynet/metadata/${skylink}`;
  const headers = {
    "skynet-portal-api": portalUrl,
    "skynet-skylink": skylink,
  };

  beforeEach(() => {
    mock = new MockAdapter(axios);
    mock.onHead(portalUrl).replyOnce(200, {}, { "skynet-portal-api": portalUrl });
  });

  const skynetFileMetadata = { filename: "sia.pdf" };

  it("should successfully fetch skynet file metadata from skylink", async () => {
    mock.onGet(skylinkUrl).replyOnce(200, skynetFileMetadata, headers);

    const { metadata } = await client.getMetadata(skylink);

    expect(metadata).toEqual(skynetFileMetadata);
  });

  it("should throw if a path is supplied", async () => {
    mock.onGet(skylinkUrl).replyOnce(200, skynetFileMetadata);

    await expect(client.getMetadata(`${skylink}/path/file`)).rejects.toThrowError(
      "Skylink string should not contain a path"
    );
  });

  it("should throw if no data was returned to getMetadata", async () => {
    mock.onGet(skylinkUrl).replyOnce(200);

    await expect(client.getMetadata(skylink)).rejects.toThrowError(
      "Metadata response invalid despite a successful request. Please try again and report this issue to the devs if it persists. Error: 'response.data' field missing"
    );
  });

  it("should throw if no headers were returned", async () => {
    mock.onGet(skylinkUrl).replyOnce(200, {});

    await expect(client.getMetadata(skylink)).rejects.toThrowError(
      "Metadata response invalid despite a successful request. Please try again and report this issue to the devs if it persists. Error: 'response.headers' field missing"
    );
  });

  it("should throw if skynet-portal-api header is missing", async () => {
    const incompleteHeaders: Record<string, unknown> = { ...headers };
    incompleteHeaders["skynet-portal-api"] = undefined;

    mock.onGet(skylinkUrl).replyOnce(200, {}, incompleteHeaders);

    await expect(client.getMetadata(skylink)).rejects.toThrowError(
      "Metadata response invalid despite a successful request. Please try again and report this issue to the devs if it persists. Error: 'skynet-portal-api' header missing"
    );
  });

  it("should throw if skynet-skylink header is missing", async () => {
    const incompleteHeaders: Record<string, unknown> = { ...headers };
    incompleteHeaders["skynet-skylink"] = undefined;

    mock.onGet(skylinkUrl).replyOnce(200, {}, incompleteHeaders);

    await expect(client.getMetadata(skylink)).rejects.toThrowError(
      "Metadata response invalid despite a successful request. Please try again and report this issue to the devs if it persists. Error: 'skynet-skylink' header missing"
    );
  });
});

describe("getFileContent", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    mock.onHead(portalUrl).replyOnce(200, {}, { "skynet-portal-api": portalUrl });
  });

  const skynetFileContents = { arbitrary: "json string" };
  const headers = {
    "skynet-portal-api": portalUrl,
    "skynet-skylink": skylink,
    "content-type": "application/json",
  };

  it.each(validSkylinkVariations)("should successfully fetch skynet file content for %s", async (input) => {
    const skylinkUrl = await client.getSkylinkUrl(input);
    mock.onGet(skylinkUrl).replyOnce(200, skynetFileContents, headers);

    const { data, contentType, skylink: skylink2 } = await client.getFileContent(input);

    expect(data).toEqual(skynetFileContents);
    expect(contentType).toEqual("application/json");
    expect(skylink2).toEqual(sialink);
  });

  it("should throw if data is not returned", async () => {
    mock.onGet(expectedUrl).replyOnce(200);

    await expect(client.getFileContent(skylink)).rejects.toThrowError(
      "File content response invalid despite a successful request. Please try again and report this issue to the devs if it persists. Error: 'response.data' field missing"
    );
  });

  it("should throw if no headers are returned", async () => {
    mock.onGet(expectedUrl).replyOnce(200, {});

    await expect(client.getFileContent(skylink)).rejects.toThrowError(
      "File content response invalid despite a successful request. Please try again and report this issue to the devs if it persists. Error: 'response.headers' field missing"
    );
  });

  it("should throw if content-type header is missing", async () => {
    const incompleteHeaders: Record<string, unknown> = { ...headers };
    incompleteHeaders["content-type"] = undefined;

    mock.onGet(expectedUrl).replyOnce(200, {}, incompleteHeaders);

    await expect(client.getFileContent(skylink)).rejects.toThrowError(
      "File content response invalid despite a successful request. Please try again and report this issue to the devs if it persists. Error: 'content-type' header missing"
    );
  });

  it("should throw if skynet-portal-api header is missing", async () => {
    const incompleteHeaders: Record<string, unknown> = { ...headers };
    incompleteHeaders["skynet-portal-api"] = undefined;

    mock.onGet(expectedUrl).replyOnce(200, {}, incompleteHeaders);

    await expect(client.getFileContent(skylink)).rejects.toThrowError(
      "File content response invalid despite a successful request. Please try again and report this issue to the devs if it persists. Error: 'skynet-portal-api' header missing"
    );
  });

  it("should throw if skynet-skylink header is missing", async () => {
    const incompleteHeaders: Record<string, unknown> = { ...headers };
    incompleteHeaders["skynet-skylink"] = undefined;

    mock.onGet(expectedUrl).replyOnce(200, {}, incompleteHeaders);

    await expect(client.getFileContent(skylink)).rejects.toThrowError(
      "File content response invalid despite a successful request. Please try again and report this issue to the devs if it persists. Error: 'skynet-skylink' header missing"
    );
  });

  it("should set range header if range option is set", async () => {
    mock.onGet(expectedUrl).replyOnce(200, skynetFileContents, headers);

    const range = "4000-5000";
    await client.getFileContent(skylink, { range });

    expect(mock.history.get.length).toBe(1);
    const request = mock.history.get[0];

    expect(request.headers["range"]).toEqual(range);
  });

  it("should register onDownloadProgress callback if defined", async () => {
    mock.onGet(expectedUrl).reply(200, skynetFileContents, headers);

    // Assert `onDownloadProgress` is not defined if not set.
    await client.getFileContent(skylink);
    expect(mock.history.get.length).toBe(1);
    const request1 = mock.history.get[0];
    expect(request1.onDownloadProgress).not.toBeDefined();

    // Assert `onDownloadProgress` is defined when passed as an option.
    await client.getFileContent(skylink, { onDownloadProgress: jest.fn() });
    expect(mock.history.get.length).toBe(2);
    const request2 = mock.history.get[1];
    expect(request2.onDownloadProgress).toBeDefined();
  });

  describe("proof validation", () => {
    it("should throw if skynet-proof header is not valid JSON", async () => {
      const headersWithProof: Record<string, unknown> = { ...headers };
      headersWithProof["skynet-proof"] = "foo";

      mock.onGet(expectedUrl).reply(200, {}, headersWithProof);

      await expect(client.getFileContent(skylink)).rejects.toThrowError(
        "File content response invalid despite a successful request. Please try again and report this issue to the devs if it persists. Error: Could not parse 'skynet-proof' header as JSON: SyntaxError: Unexpected token o in JSON at position 1"
      );
    });

    it("should throw if skynet-proof header is null", async () => {
      const headersWithProof: Record<string, unknown> = { ...headers };
      headersWithProof["skynet-proof"] = "null";

      mock.onGet(expectedUrl).reply(200, {}, headersWithProof);

      await expect(client.getFileContent(skylink)).rejects.toThrowError(
        "File content response invalid despite a successful request. Please try again and report this issue to the devs if it persists. Error: Could not parse 'skynet-proof' header as JSON: Error: Could not parse 'skynet-proof' header as JSON"
      );
    });

    it("should throw if skynet-skylink does not match input data link", async () => {
      const headersWithProof: Record<string, unknown> = { ...headers };
      headersWithProof["skynet-proof"] = "[]";
      headersWithProof["skynet-skylink"] = entryLink;

      mock.onGet(expectedUrl).reply(200, {}, headersWithProof);

      await expect(client.getFileContent(skylink)).rejects.toThrowError(
        "File content response invalid despite a successful request. Please try again and report this issue to the devs if it persists. Error: Expected returned skylink to be the same as input data link"
      );
    });

    it("should throw if proof is present for data link", async () => {
      const headersWithProof: Record<string, unknown> = { ...headers };
      headersWithProof["skynet-proof"] = "[1, 2]";

      mock.onGet(expectedUrl).reply(200, {}, headersWithProof);

      await expect(client.getFileContent(skylink)).rejects.toThrowError(
        "File content response invalid despite a successful request. Please try again and report this issue to the devs if it persists. Error: Expected 'skynet-proof' header to be empty for data link"
      );
    });

    it("should throw if skynet-skylink matches input entry link", async () => {
      const headersWithProof: Record<string, unknown> = { ...headers };
      headersWithProof["skynet-proof"] = "[]";
      headersWithProof["skynet-skylink"] = entryLink;

      mock.onGet(expectedEntryLinkUrl).reply(200, {}, headersWithProof);

      await expect(client.getFileContent(entryLink)).rejects.toThrowError(
        "File content response invalid despite a successful request. Please try again and report this issue to the devs if it persists. Error: Expected returned skylink to be different from input entry link"
      );
    });

    it("should throw if proof is empty for entry link", async () => {
      const headersWithProof: Record<string, unknown> = { ...headers };
      headersWithProof["skynet-proof"] = "[]";

      mock.onGet(expectedEntryLinkUrl).reply(200, {}, headersWithProof);

      await expect(client.getFileContent(entryLink)).rejects.toThrowError(
        "File content response invalid despite a successful request. Please try again and report this issue to the devs if it persists. Error: Expected registry proof not to be empty"
      );
    });

    it("should throw if proof contains unsupported registry type", async () => {
      const headersWithProof: Record<string, unknown> = { ...headers };
      // Corrupt the type.
      headersWithProof[
        "skynet-proof"
      ] = `[{"data":"5c006f8bb26d25b412300703c275279a9d852833e383cfed4d314fe01c0c4b155d12","revision":0,"datakey":"43c8a9b01609544ab152dad397afc3b56c1518eb546750dbc6cad5944fec0292","publickey":{"algorithm":"ed25519","key":"y/l99FyfFm6JPhZL5xSkruhA06Qh9m5S9rnipQCc+rw="},"signature":"5a1437508eedb6f5352d7f744693908a91bb05c01370ce4743de9c25f761b4e87760b8172448c073a4ddd9d58d1a2bf978b3227e57e4fa8cbe830a2353be2207","type":0}]`;

      mock.onGet(expectedEntryLinkUrl).reply(200, {}, headersWithProof);

      await expect(client.getFileContent(entryLink)).rejects.toThrowError(
        "File content response invalid despite a successful request. Please try again and report this issue to the devs if it persists. Error: Unsupported registry type in proof: '0'"
      );
    });

    it("should throw if proof chain is invalid", async () => {
      // Corrupt the input skylink.
      const newSkylink = entryLink.replace("-", "_");

      const headersWithProof: Record<string, unknown> = { ...headers };
      headersWithProof[
        "skynet-proof"
      ] = `[{"data":"5c006f8bb26d25b412300703c275279a9d852833e383cfed4d314fe01c0c4b155d12","revision":0,"datakey":"43c8a9b01609544ab152dad397afc3b56c1518eb546750dbc6cad5944fec0292","publickey":{"algorithm":"ed25519","key":"y/l99FyfFm6JPhZL5xSkruhA06Qh9m5S9rnipQCc+rw="},"signature":"5a1437508eedb6f5352d7f744693908a91bb05c01370ce4743de9c25f761b4e87760b8172448c073a4ddd9d58d1a2bf978b3227e57e4fa8cbe830a2353be2207","type":1}]`;

      mock.onGet(`${portalUrl}/${newSkylink}`).reply(200, {}, headersWithProof);

      await expect(client.getFileContent(newSkylink)).rejects.toThrowError(
        "File content response invalid despite a successful request. Please try again and report this issue to the devs if it persists. Error: Could not verify registry proof chain"
      );
    });

    it("should throw if signature is invalid", async () => {
      const headersWithProof: Record<string, unknown> = { ...headers };
      // Use a corrupted signature.
      headersWithProof[
        "skynet-proof"
      ] = `[{"data":"5c006f8bb26d25b412300703c275279a9d852833e383cfed4d314fe01c0c4b155d12","revision":0,"datakey":"43c8a9b01609544ab152dad397afc3b56c1518eb546750dbc6cad5944fec0292","publickey":{"algorithm":"ed25519","key":"y/l99FyfFm6JPhZL5xSkruhA06Qh9m5S9rnipQCc+rw="},"signature":"4a1437508eedb6f5352d7f744693908a91bb05c01370ce4743de9c25f761b4e87760b8172448c073a4ddd9d58d1a2bf978b3227e57e4fa8cbe830a2353be2207","type":1}]`;

      mock.onGet(expectedEntryLinkUrl).reply(200, {}, headersWithProof);

      await expect(client.getFileContent(entryLink)).rejects.toThrowError(
        "File content response invalid despite a successful request. Please try again and report this issue to the devs if it persists. Error: Could not verify signature from retrieved, signed registry entry in registry proof"
      );
    });

    it("should throw if proof chain results in different data link", async () => {
      const dataLink = "EAAFgq17B-MKsi0ARYKUMmf9vxbZlDpZkA6EaVBCG4YBAQ";

      const headersWithProof: Record<string, unknown> = { ...headers };
      headersWithProof[
        "skynet-proof"
      ] = `[{"data":"5c006f8bb26d25b412300703c275279a9d852833e383cfed4d314fe01c0c4b155d12","revision":0,"datakey":"43c8a9b01609544ab152dad397afc3b56c1518eb546750dbc6cad5944fec0292","publickey":{"algorithm":"ed25519","key":"y/l99FyfFm6JPhZL5xSkruhA06Qh9m5S9rnipQCc+rw="},"signature":"5a1437508eedb6f5352d7f744693908a91bb05c01370ce4743de9c25f761b4e87760b8172448c073a4ddd9d58d1a2bf978b3227e57e4fa8cbe830a2353be2207","type":1}]`;
      headersWithProof["skynet-skylink"] = dataLink;

      mock.onGet(expectedEntryLinkUrl).reply(200, {}, headersWithProof);

      await expect(client.getFileContent(entryLink)).rejects.toThrowError(
        "File content response invalid despite a successful request. Please try again and report this issue to the devs if it persists. Error: Could not verify registry proof chain"
      );
    });
  });
});

describe("getFileContentHns", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    mock.onHead(portalUrl).replyOnce(200, {}, { "skynet-portal-api": portalUrl });
  });

  const skynetFileContents = { arbitrary: "json string" };
  const headers = {
    "skynet-portal-api": portalUrl,
    "skynet-skylink": skylink,
    "content-type": "application/json",
  };

  it.each(validHnsLinkVariations)("should successfully fetch skynet file content for domain '%s'", async (domain) => {
    const hnsUrl = await client.getHnsUrl(domain);
    const hnsresUrl = await client.getHnsresUrl(domain);
    mock.onGet(hnsUrl).reply(200, skynetFileContents, headers);
    mock.onGet(hnsresUrl).reply(200, { skylink });

    const { data } = await client.getFileContentHns(domain);

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

      const expectedPathUrl = `${expectedUrl}${path}`;
      expect(windowOpen).toHaveBeenCalledTimes(1);
      expect(windowOpen).toHaveBeenCalledWith(expectedPathUrl, "_blank");
    }
  );
});

describe("downloadFileHns", () => {
  it.each(validHnsLinkVariations)(
    "should set domain %s with the portal and hns link and then call window.openFile with attachment set",
    async (input) => {
      mockLocationAssign.mockClear();

      await client.downloadFileHns(input);

      expect(mockLocationAssign).toHaveBeenCalledWith(`${expectedHnsUrl}?attachment=true`);
    }
  );
});

describe("openFileHns", () => {
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
      expect(windowOpen).toHaveBeenCalledWith(expectedHnsUrl, "_blank");
    }
  });
});

describe("resolveHns", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    mock.onHead(portalUrl).replyOnce(200, {}, { "skynet-portal-api": portalUrl });
  });

  it.each(validHnsLinkVariations)(
    "should call axios.get with the portal and hnsres link for %s and return the json body",
    async (hnsLink) => {
      mock.onGet(expectedHnsresUrl).replyOnce(200, { skylink });
      mock.resetHistory();

      const data = await client.resolveHns(hnsLink);

      expect(mock.history.get.length).toBe(1);
      expect(data.skylink).toEqual(skylink);
    }
  );

  it("should throw if no data was returned to resolveHns", async () => {
    mock.onGet(expectedHnsresUrl).replyOnce(200);

    await expect(client.resolveHns(hnsLink)).rejects.toThrowError(
      "Did not get a complete resolve HNS response despite a successful request. Please try again and report this issue to the devs if it persists. Error: 'response.data' field missing"
    );
  });

  it("should throw if unexpected data was returned to resolveHns", async () => {
    mock.onGet(expectedHnsresUrl).replyOnce(200, { foo: "foo" });

    await expect(client.resolveHns(hnsLink)).rejects.toThrowError(
      "Did not get a complete resolve HNS response despite a successful request. Please try again and report this issue to the devs if it persists. Error: Expected response data object 'response.data' to be object containing skylink or registry field, was type 'object', value '[object Object]'"
    );
  });
});
