import axios from "axios";
import MockAdapter from "axios-mock-adapter";

import { SkynetClient, defaultSkynetPortalUrl } from "./index";

const mock = new MockAdapter(axios);

const portalUrl = defaultSkynetPortalUrl;
const hnsLink = "foo";
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

      expect(windowOpen).toHaveBeenCalledTimes(1);
      expect(windowOpen).toHaveBeenCalledWith(`${portalUrl}/${skylink}?attachment=true`, "_blank");
    });
  });
});

describe("getDownloadUrl", () => {
  it("should return correctly formed download URL", () => {
    validSkylinkVariations.forEach((input) => {
      expect(client.getDownloadUrl(input)).toEqual(`${portalUrl}/${skylink}`);
    });
  });

  it("should return correctly formed url with forced download", () => {
    const url = client.getDownloadUrl(skylink, { download: true });

    expect(url).toEqual(`${portalUrl}/${skylink}?attachment=true`);
  });
});

describe("open", () => {
  it("should call window.open", () => {
    const windowOpen = jest.spyOn(window, "open").mockImplementation();

    validSkylinkVariations.forEach((input) => {
      windowOpen.mockReset();

      client.open(input);

      expect(windowOpen).toHaveBeenCalledTimes(1);
      expect(windowOpen).toHaveBeenCalledWith(`${portalUrl}/${skylink}`, "_blank");
    });
  });
});

describe("downloadHns", () => {
  const hnsUrl = `${portalUrl}/hns/${hnsLink}`;

  beforeEach(() => {
    mock.onGet(hnsUrl).reply(200, { skylink: skylink });
  });

  it("should call axios.get with the portal and hns link and then window.open with attachment set", async () => {
    const windowOpen = jest.spyOn(window, "open").mockImplementation();

    for (const input of validHnsLinkVariations) {
      mock.resetHistory();
      windowOpen.mockReset();

      await client.downloadHns(input);

      expect(mock.history.get.length).toBe(1);

      expect(windowOpen).toHaveBeenCalledTimes(1);
      expect(windowOpen).toHaveBeenCalledWith(`${portalUrl}/${skylink}?attachment=true`, "_blank");
    }
  });
});

describe("openHns", () => {
  const hnsUrl = `${portalUrl}/hns/${hnsLink}`;

  beforeEach(() => {
    mock.onGet(hnsUrl).reply(200, { skylink: skylink });
  });

  it("should call axios.get with the portal and hns link and then window.open", async () => {
    const windowOpen = jest.spyOn(window, "open").mockImplementation();

    for (const input of validHnsLinkVariations) {
      mock.resetHistory();
      windowOpen.mockReset();

      await client.openHns(input);

      expect(mock.history.get.length).toBe(1);

      expect(windowOpen).toHaveBeenCalledTimes(1);
      expect(windowOpen).toHaveBeenCalledWith(`${portalUrl}/${skylink}`, "_blank");
    }
  });
});

describe("resolveHns", () => {
  const hnsresUrl = `${portalUrl}/hnsres/${hnsLink}`;

  beforeEach(() => {
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
