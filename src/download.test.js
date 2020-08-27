import axios from "axios";
import MockAdapter from "axios-mock-adapter";

import { SkynetClient, defaultSkynetPortalUrl } from "./index";

const mock = new MockAdapter(axios);

const portalUrl = defaultSkynetPortalUrl;
const hnsLink = "foo";
const hnsUrl = `${portalUrl}/hns/${hnsLink}`;
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

describe("downloadFile", () => {
  it("should call window.open with a download url with attachment set", () => {
    const windowOpen = jest.spyOn(window, "open").mockImplementation();

    validSkylinkVariations.forEach((input) => {
      windowOpen.mockReset();

      client.downloadFile(input);

      expect(mock.history.get.length).toBe(0);
    });
  });
});

describe("getHnsUrl", () => {
  it("should return correctly formed hns URL", () => {
    validHnsLinkVariations.forEach((input) => {
      expect(client.getHnsUrl(input)).toEqual(hnsUrl);
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
    const windowOpen = jest.spyOn(window, "open").mockImplementation();

    for (const input of validHnsLinkVariations) {
      mock.resetHistory();
      windowOpen.mockReset();

      await client.downloadFileHns(input);

      expect(mock.history.get.length).toBe(0);
    }
  });
});

describe("openFileHns", () => {
  const hnsUrl = `${portalUrl}/hns/${hnsLink}`;

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

describe("resolveSkylinkHns", () => {
  beforeEach(() => {
    mock.onGet(hnsresUrl).reply(200, { skylink: skylink });
  });

  it("should call axios.get with the portal and hnsres link and return the json body", async () => {
    for (const input of validHnsresLinkVariations) {
      mock.resetHistory();

      const data = await client.resolveSkylinkHns(input);

      expect(mock.history.get.length).toBe(1);
      expect(data.skylink).toEqual(skylink);
    }
  });
});
