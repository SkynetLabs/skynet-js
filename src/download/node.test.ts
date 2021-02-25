import axios from "axios";
import tmp from "tmp";

import { SkynetClient, defaultPortalUrl, uriSkynetPrefix } from "../index.node";

jest.mock("axios");

const portalUrl = defaultPortalUrl();
const skylink = "XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg";
const sialink = `${uriSkynetPrefix}${skylink}`;
const client = new SkynetClient();

const skynetfileContentType = "application/json";
const skynetFileMetadata = { filename: "sia.pdf" };
const fullHeaders = {
  "skynet-skylink": skylink,
  "content-type": skynetfileContentType,
  "skynet-file-metadata": JSON.stringify(skynetFileMetadata),
};
const body = "asdf";

describe("downloadFileToPath", () => {
  beforeEach(() => {
    // @ts-ignore
    axios.mockResolvedValue({ data: { body, pipe: function () {} }, headers: fullHeaders });
  });

  it("should send get request to default portal", () => {
    const tmpFile = tmp.fileSync();

    client.downloadFileToPath(skylink, tmpFile.name);

    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `${portalUrl}/${skylink}`,
        method: "get",
      })
    );

    tmpFile.removeCallback();
  });

  it("should use custom connection options if defined on the client", async () => {
    const tmpFile = tmp.fileSync();
    const client = new SkynetClient("", { APIKey: "foobar", customUserAgent: "Sia-Agent" });

    const {contentType, metadata, skylink: skylink2} = await client.downloadFileToPath(skylink, tmpFile.name, { APIKey: "barfoo", customUserAgent: "Sia-Agent-2" });

    expect(contentType).toEqual(skynetfileContentType);
    expect(metadata).toEqual(skynetFileMetadata);
    expect(skylink2).toEqual(sialink);

    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `${portalUrl}/${skylink}`,
        auth: { username: "", password: "barfoo" },
        headers: expect.objectContaining({ "User-Agent": "Sia-Agent-2" }),
      })
    );

    tmpFile.removeCallback();
  });

  it("should fetch info even when headers are missing", async () => {
    // @ts-ignore
    axios.mockResolvedValue({ data: { body, pipe: function () {} }, headers: {} });

    const tmpFile = tmp.fileSync();

    const {contentType, metadata, skylink: skylink2} = await client.downloadFileToPath(skylink, tmpFile.name);

    expect(contentType).toEqual("");
    expect(metadata).toEqual({});
    expect(skylink2).toEqual("");

    tmpFile.removeCallback();
  });
});

describe("downloadFileHnsToPath", () => {
  const domain = "foo";

  beforeEach(() => {
    // @ts-ignore
    axios.mockResolvedValue({ data: { body, pipe: function () {} }, headers: fullHeaders });
  });

  it("should send get request to default portal", async () => {
    const tmpFile = tmp.fileSync();

    const { contentType, metadata, skylink: skylink2 } = await client.downloadFileHnsToPath(domain, tmpFile.name);

    expect(contentType).toEqual(skynetfileContentType);
    expect(metadata).toEqual(skynetFileMetadata);
    expect(skylink2).toEqual(sialink);

    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `${portalUrl}/hns/${domain}`,
        method: "get",
      })
    );

    tmpFile.removeCallback();
  });

  it("should get info when headers are missing", async () => {
    // @ts-ignore
    axios.mockResolvedValue({ data: { body, pipe: function () {} }, headers: {} });

    const tmpFile = tmp.fileSync();

    const { contentType, metadata, skylink: skylink2 } = await client.downloadFileHnsToPath(domain, tmpFile.name);

    expect(contentType).toEqual("");
    expect(metadata).toEqual({});
    expect(skylink2).toEqual("");

    tmpFile.removeCallback();
  });
});
