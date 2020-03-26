import parse from "url-parse";
import axios from "axios";

export default function SkynetClient(portalUrl) {
  this.upload = upload.bind(null, portalUrl);
  this.uploadDirectory = upload.bind(null, portalUrl);
  this.download = download.bind(null, portalUrl);
  this.open = open.bind(null, portalUrl);
  this.getUrl = getUrl.bind(null, portalUrl);
}

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

export function download(portalUrl, skylink) {
  const url = getUrl(portalUrl, skylink, { download: true });

  window.open(url, "_blank");
}

export function open(portalUrl, skylink) {
  const url = getUrl(portalUrl, skylink);

  window.open(url, "_blank");
}

export function getUrl(portalUrl, skylink, options = {}) {
  const parsed = parse(portalUrl);

  parsed.set("pathname", skylink);

  if (options.download) {
    parsed.set("query", { attachment: true });
  }

  return parsed.toString();
}
