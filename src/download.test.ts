import axios from "axios";
import MockAdapter from "axios-mock-adapter";

import { SkynetClient, defaultSkynetPortalUrl } from "./index";

const portalUrl = defaultSkynetPortalUrl;
const hnsLink = "foo";
const hnsUrl = `${portalUrl}/hns/${hnsLink}`;
const hnsUrlSubdomain = `https://${hnsLink}.hns.siasky.net`;
const hnsresUrl = `${portalUrl}/hnsres/${hnsLink}`;
const client = new SkynetClient(portalUrl);
const skylink = "XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg";
const validSkylinkVariations = [
  skylink,
  `sia:${skylink}`,
  `sia://${skylink}`,
  `${portalUrl}/${skylink}`,
  `${portalUrl}/${skylink}/foo/bar`,
  `${portalUrl}/${skylink}?foo=bar`,
];
const validHnsLinkVariations = [hnsLink, `hns:${hnsLink}`, `hns://${hnsLink}`];
const validHnsresLinkVariations = [hnsLink, `hnsres:${hnsLink}`, `hnsres://${hnsLink}`];

const mockLocationAssign = jest.fn();
Object.defineProperty(window, "location", {
  value: {
    assign: mockLocationAssign,
  },
  writable: true,
});

describe("downloadFile", () => {
  it("should call window.open with a download url with attachment set", () => {
    validSkylinkVariations.forEach((input) => {
      mockLocationAssign.mockClear();

      client.downloadFile(input);

      expect(mockLocationAssign).toHaveBeenCalledWith(`${portalUrl}/${skylink}?attachment=true`);
    });
  });
});

describe("getHnsUrl", () => {
  it("should return correctly formed hns URL", () => {
    validHnsLinkVariations.forEach((input) => {
      expect(client.getHnsUrl(input)).toEqual(hnsUrl);
      expect(client.getHnsUrl(input, { subdomain: true })).toEqual(hnsUrlSubdomain);
    });
  });

  it("should return correctly formed hns URL with forced download", () => {
    const url = client.getHnsUrl(hnsLink, { download: true });

    expect(url).toEqual(`${hnsUrl}?attachment=true`);
  });
});

describe("getHnsresUrl", () => {
  it("should return correctly formed hnsres URL", () => {
    validHnsresLinkVariations.forEach((input) => {
      expect(client.getHnsresUrl(input)).toEqual(hnsresUrl);
    });
  });
});

describe("getSkylinkUrl", () => {
  it("should return correctly formed skylink URL", () => {
    validSkylinkVariations.forEach((input) => {
      expect(client.getSkylinkUrl(input)).toEqual(`${portalUrl}/${skylink}`);
    });
  });

  it("should return correctly formed URL with forced download", () => {
    const url = client.getSkylinkUrl(skylink, { download: true, endpointPath: "skynet/skylink" });

    expect(url).toEqual(`${portalUrl}/skynet/skylink/${skylink}?attachment=true`);
  });

  it("should convert base64 skylinks to base32", () => {
    const expectedBase32 = "https://bg06v2tidkir84hg0s1s4t97jaeoaa1jse1svrad657u070c9calq4g.siasky.net";

    validSkylinkVariations.forEach((input) => {
      const url = client.getSkylinkUrl(input, { subdomain: true });

      expect(url).toEqual(expectedBase32);
    });
  });
});

describe("getMetadata", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axios);
  });

  it("should fetch successfully skynet file headers", () => {
    const skynetFileMetadata = { filename: "sia.pdf" };
    const headers = { "skynet-skylink": skylink, "skynet-file-metadata": JSON.stringify(skynetFileMetadata) };

    validSkylinkVariations.forEach(async (input) => {
      const skylinkUrl = client.getSkylinkUrl(input);
      mock.onHead(skylinkUrl).reply(200, {}, headers);

      const responseMetadata = await client.getMetadata(input);

      expect(responseMetadata).toEqual(skynetFileMetadata);
    });
  });

  it("should fail quietly when skynet headers not present", () => {
    const headers = { "skynet-skylink": skylink };

    validSkylinkVariations.forEach(async (input) => {
      const skylinkUrl = client.getSkylinkUrl(input);
      mock.onHead(skylinkUrl).reply(200, {}, headers);

      const responseMetadata = await client.getMetadata(input);

      expect(responseMetadata).toEqual({});
    });
  });
});

describe("getFileContent", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axios);
  });

  it("should fetch successfully skynet file", () => {
    const skynetFileContents = { arbitrary: "json string" };
    const headers = { "content-type": "application/json" };

    validSkylinkVariations.forEach(async (input) => {
      const skylinkUrl = client.getSkylinkUrl(input);
      mock.onGet(skylinkUrl).reply(200, skynetFileContents, headers);

      const fileData = await client.getFileContent(input);

      expect(fileData).toEqual(skynetFileContents);
    });
  });
});

describe("open", () => {
  it("should call window.openFile", () => {
    const windowOpen = jest.spyOn(window, "open").mockImplementation();

    validSkylinkVariations.forEach((input) => {
      windowOpen.mockReset();

      client.openFile(input);

      expect(windowOpen).toHaveBeenCalledTimes(1);
      expect(windowOpen).toHaveBeenCalledWith(`${portalUrl}/${skylink}`, "_blank");
    });
  });
});

describe("downloadFileHns", () => {
  it("should set domain with the portal and hns link and then call window.openFile with attachment set", async () => {
    for (const input of validHnsLinkVariations) {
      mockLocationAssign.mockClear();

      await client.downloadFileHns(input);

      expect(mockLocationAssign).toHaveBeenCalledWith("https://siasky.net/hns/foo?attachment=true");
    }
  });
});

describe("openFileHns", () => {
  const hnsUrl = `${portalUrl}/hns/${hnsLink}`;
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axios);
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
    mock.onGet(hnsresUrl).reply(200, { skylink: skylink });
  });

  it("should call axios.get with the portal and hnsres link and return the json body", async () => {
    for (const input of validHnsresLinkVariations) {
      mock.resetHistory();

      const data = await client.resolveHns(input);

      expect(mock.history.get.length).toBe(1);
      expect(data.skylink).toEqual(skylink);
    }
  });
});
