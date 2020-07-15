import axios from "axios";
import parse from "url-parse";

export async function upload(portalUrl, file, options = {}) {
  const formData = new FormData();

  formData.append("file", file);

  const parsed = parse(portalUrl);

  parsed.set("pathname", "/skynet/skyfile");

  const { data } = await axios.post(
    parsed.toString(),
    formData,
    options.onUploadProgress && {
      onUploadProgress: ({ loaded, total }) => {
        const progress = loaded / total;

        options.onUploadProgress(progress, { loaded, total });
      },
    }
  );

  return data;
}

export async function uploadDirectory(portalUrl, directory, filename, options = {}) {
  const formData = new FormData();

  Object.entries(directory).forEach(([path, file]) => {
    formData.append("files[]", file, path);
  });

  const parsed = parse(portalUrl);

  parsed.set("pathname", "/skynet/skyfile");
  parsed.set("query", { filename });

  const { data } = await axios.post(
    parsed.toString(),
    formData,
    options.onUploadProgress && {
      onUploadProgress: ({ loaded, total }) => {
        const progress = loaded / total;

        options.onUploadProgress(progress, { loaded, total });
      },
    }
  );

  return data;
}
