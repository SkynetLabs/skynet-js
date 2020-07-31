import axios from "axios";
import MockAdapter from "axios-mock-adapter";

import { SkynetClient, defaultSkynetPortalUrl } from "./index";
import { compareFormData } from "./test_utils.js";

const mock = new MockAdapter(axios);

const portalUrl = defaultSkynetPortalUrl;
const client = new SkynetClient(portalUrl);
const url = `${portalUrl}/skynet/skyfile`;
const skylink = "XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg";

describe("uploadFile", () => {
  const filename = "bar.txt";
  const file = new File(["foo"], filename, {
    type: "text/plain",
  });

  beforeEach(() => {
    mock.onPost(url).reply(200, { skylink: skylink });
  });

  it("should send formdata with file", async () => {
    const data = await client.upload(file);

    expect(mock.history.post.length).toBe(1);
    const request = mock.history.post[0];
    mock.resetHistory();

    await compareFormData(request.data, [["file", "foo"]]);

    expect(data).toEqual({ skylink });
  });

  it("should send register onUploadProgress callback if defined", async() => {
    const newPortal = "https://my-portal.net";
    const url = `${newPortal}/skynet/skyfile`;
    const client = new SkynetClient(newPortal);
    mock.onPost(url).replyOnce(200, { skylink: skylink });

    const data = await client.upload(file, { onUploadProgress: jest.fn() });

    console.log(mock.history.post);

    expect(mock.history.post.length).toBe(1);
    const request = mock.history.post[0];
    mock.resetHistory();

    expect(request.onUploadProgress).toEqual(expect.any(Function));
    await compareFormData(request.data, [["file", "foo"]]);

    expect(data).toEqual({ skylink });
  });

  it("should send base-64 authentication password if provided", async () => {
    const data = await client.upload(file, { APIKey: "foobar" });

    expect(mock.history.post.length).toBe(1);
    const request = mock.history.post[0];
    mock.resetHistory();

    expect(request.auth).toEqual({username: "", password: "foobar"});
    await compareFormData(request.data, [["file", "foo"]]);

    expect(data).toEqual({ skylink });
  });
});

// describe("uploadDirectory", () => {
//   const blob = new Blob([], { type: "image/jpeg" });
//   const filename = "i-am-root";
//   const directory = {
//     "i-am-not/file1.jpeg": new File([blob], "i-am-not/file1.jpeg"),
//     "i-am-not/file2.jpeg": new File([blob], "i-am-not/file2.jpeg"),
//     "i-am-not/me-neither/file3.jpeg": new File([blob], "i-am-not/me-neither/file3.jpeg"),
//   };

//   beforeEach(() => {
//     axios.post.mockResolvedValue({ data: { skylink } });
//   });

//   it("should send post request with FormData", () => {
//     client.uploadDirectory(directory, filename);

//     expect(axios.post).toHaveBeenCalledWith(
//       `${portalUrl}/skynet/skyfile?filename=${filename}`,
//       expect.any(FormData), // TODO: Inspect data contents.
//       undefined
//     );
//   });

//   it("should send register onUploadProgress callback if defined", () => {
//     client.uploadDirectory(directory, filename, { onUploadProgress: jest.fn() });

//     expect(axios.post).toHaveBeenCalledWith(
//       `${portalUrl}/skynet/skyfile?filename=${filename}`,
//       expect.any(FormData), // TODO: Inspect data contents.
//       {
//         onUploadProgress: expect.any(Function),
//       });
//   });

//   it("should return single skylink on success", async () => {
//     const data = await client.uploadDirectory(directory, filename);

//     expect(data).toEqual({ skylink });
//   });
// });
