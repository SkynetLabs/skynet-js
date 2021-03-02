import { PassThrough } from "stream";
import axios from "axios";
import fs from "fs";

import { SkynetClient, defaultPortalUrl, uriSkynetPrefix } from "../index.node";

jest.mock("axios");
jest.mock("fs");

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
const filename = "foo";

describe("downloadFileToPath", () => {
  beforeEach(() => {
    // @ts-expect-error TS complaining.
    axios.mockResolvedValue({ data: { body, pipe: jest.fn() }, headers: fullHeaders });
    const mockWriteable = new PassThrough();
    // @ts-expect-error TS complaining.
    fs.createWriteStream.mockReturnValueOnce(mockWriteable);
    setTimeout(() => {
      mockWriteable.emit("finish");
    }, 100);
  });

  it("should send get request to default portal", async () => {
    await client.downloadFileToPath(skylink, filename);

    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `${portalUrl}/${skylink}`,
        method: "get",
      })
    );
  });

  it("should use custom connection options if defined on the client", async () => {
    const client = new SkynetClient("", { APIKey: "foobar", customUserAgent: "Sia-Agent" });

    const { contentType, metadata, skylink: skylink2 } = await client.downloadFileToPath(skylink, filename, {
      APIKey: "barfoo",
      customUserAgent: "Sia-Agent-2",
    });

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
  });

  it("should fetch info even when headers are missing", async () => {
    // @ts-expect-error TS complaining.
    axios.mockResolvedValue({ data: { body, pipe: jest.fn() }, headers: {} });

    const { contentType, metadata, skylink: skylink2 } = await client.downloadFileToPath(skylink, filename);

    expect(contentType).toEqual("");
    expect(metadata).toEqual({});
    expect(skylink2).toEqual("");
  });
});

describe("downloadFileHnsToPath", () => {
  const domain = "foo";

  beforeEach(() => {
    // @ts-expect-error TS complaining.
    axios.mockResolvedValue({ data: { body, pipe: jest.fn() }, headers: fullHeaders });
    const mockWriteable = new PassThrough();
    // @ts-expect-error TS complaining.
    fs.createWriteStream.mockReturnValueOnce(mockWriteable);
    setTimeout(() => {
      mockWriteable.emit("finish");
    }, 100);
  });

  it("should send get request for HNS to default portal", async () => {
    const { contentType, metadata, skylink: skylink2 } = await client.downloadFileHnsToPath(domain, filename);

    expect(contentType).toEqual(skynetfileContentType);
    expect(metadata).toEqual(skynetFileMetadata);
    expect(skylink2).toEqual(sialink);

    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `${portalUrl}/hns/${domain}`,
        method: "get",
      })
    );
  });

  it("should get info when headers are missing", async () => {
    // @ts-expect-error TS complaining.
    axios.mockResolvedValue({ data: { body, pipe: jest.fn() }, headers: {} });

    const { contentType, metadata, skylink: skylink2 } = await client.downloadFileHnsToPath(domain, filename);

    expect(contentType).toEqual("");
    expect(metadata).toEqual({});
    expect(skylink2).toEqual("");
  });
});
