import axios from "axios";
import fs from "fs";
import tmp from "tmp";

import { SkynetClient, defaultPortalUrl, uriSkynetPrefix } from "../index.node";

jest.mock("axios");

const portalUrl = defaultPortalUrl();
const skylink = "XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg";
const sialink = `${uriSkynetPrefix}${skylink}`;
const client = new SkynetClient();
const merkleroot = "QAf9Q7dBSbMarLvyeE6HTQmwhr7RX9VMrP9xIMzpU3I";
const bitfield = 2048;
const data = { skylink, merkleroot, bitfield };

describe("uploadFile", () => {
  const filename = "testdata/file1.txt";

  beforeEach(() => {
    // @ts-expect-error TS complaining.
    axios.mockResolvedValue({ data });
  });

  it("should send post request to default portal", () => {
    client.uploadFileFromPath(filename);

    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `${portalUrl}/skynet/skyfile`,
        data: expect.objectContaining({
          _streams: expect.arrayContaining([
            expect.stringContaining('Content-Disposition: form-data; name="file"; filename="file1.txt"'),
          ]),
        }),
      })
    );
    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `${portalUrl}/skynet/skyfile`,
        headers: expect.objectContaining({ "content-type": expect.stringContaining("multipart/form-data") }),
      })
    );
    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `${portalUrl}/skynet/skyfile`,
        data: expect.objectContaining({
          _streams: expect.arrayContaining([expect.stringContaining("Content-Type: text/plain")]),
        }),
      })
    );
  });

  it("should use custom upload options if defined", () => {
    client.uploadFileFromPath(filename, {
      endpointPath: "/skynet/file",
      portalFileFieldname: "filetest",
      customFilename: "test.jpg",
    });

    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `${portalUrl}/skynet/file`,
        data: expect.objectContaining({
          _streams: expect.arrayContaining([
            expect.stringContaining('Content-Disposition: form-data; name="filetest"; filename="test.jpg"'),
          ]),
        }),
        headers: expect.anything(),
      })
    );
  });

  it("should use custom connection options if defined on the client", () => {
    const client = new SkynetClient("", { APIKey: "foobar", customUserAgent: "Sia-Agent" });

    client.uploadFileFromPath(filename);

    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `${portalUrl}/skynet/skyfile`,
        data: expect.objectContaining({
          _streams: expect.arrayContaining([
            expect.stringContaining(`Content-Disposition: form-data; name="file"; filename="file1.txt"`),
          ]),
        }),
      })
    );
    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `${portalUrl}/skynet/skyfile`,
        auth: { username: "", password: "foobar" },
        headers: expect.objectContaining({ "User-Agent": "Sia-Agent" }),
      })
    );
  });

  it("should use custom connection options if defined on the API call", () => {
    const client = new SkynetClient("", { APIKey: "foobar", customUserAgent: "Sia-Agent" });

    client.uploadFileFromPath(filename, { APIKey: "barfoo", customUserAgent: "Sia-Agent-2" });

    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `${portalUrl}/skynet/skyfile`,
        data: expect.objectContaining({
          _streams: expect.arrayContaining([
            expect.stringContaining(`Content-Disposition: form-data; name="file"; filename="file1.txt"`),
          ]),
        }),
        auth: { username: "", password: "barfoo" },
        headers: expect.objectContaining({ "User-Agent": "Sia-Agent-2" }),
      })
    );
  });

  it("should upload tmp files", async () => {
    const file = tmp.fileSync({ postfix: ".json" });
    fs.writeFileSync(file.fd, JSON.stringify("testing"));

    const { skylink } = await client.uploadFileFromPath(file.name);

    expect(skylink).toEqual(sialink);
  });

  it("should return skylink on success", async () => {
    const { skylink } = await client.uploadFileFromPath(filename);

    expect(skylink).toEqual(sialink);
  });
});

describe("uploadDirectoryFromPath", () => {
  const dirname = "testdata";
  const directory = ["file1.txt", "file2.txt", "dir1/file3.txt"];
  const filename = `${dirname}/${directory[0]}`;

  beforeEach(() => {
    // @ts-expect-error TS complaining.
    axios.mockResolvedValue({ data });
  });

  it("should send post request to default portal", () => {
    client.uploadDirectoryFromPath(dirname);

    for (const file of directory) {
      expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `${portalUrl}/skynet/skyfile?filename=${dirname}`,
          data: expect.objectContaining({
            _streams: expect.arrayContaining([
              expect.stringContaining(`Content-Disposition: form-data; name="files[]"; filename="${file}"`),
            ]),
          }),
          headers: expect.anything(),
        })
      );
    }
  });

  it("should use custom options if defined", () => {
    client.uploadDirectoryFromPath(dirname, {
      endpointPath: "/skynet/file",
      portalDirectoryFileFieldname: "filetest",
    });

    for (const file of directory) {
      expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `${portalUrl}/skynet/file?filename=${dirname}`,
          data: expect.objectContaining({
            _streams: expect.arrayContaining([
              expect.stringContaining(`Content-Disposition: form-data; name="filetest"; filename="${file}"`),
            ]),
          }),
          headers: expect.anything(),
        })
      );
    }
  });

  it("should not work on files", async () => {
    await expect(client.uploadDirectoryFromPath(filename)).rejects.toThrowError(
      `Given path is not a directory: ${filename}`
    );
  });

  it("should return single skylink on success", async () => {
    const { skylink } = await client.uploadDirectoryFromPath(dirname);

    expect(skylink).toEqual(sialink);
  });

  it("should return single skylink on success with dryRun", async () => {
    const { skylink } = await client.uploadDirectoryFromPath(dirname, { dryRun: true });

    expect(skylink).toEqual(sialink);
  });
});
