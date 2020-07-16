import axios from "axios";
import parse from "url-parse";

export async function upload(portalUrl, file, options = {}) {
  const formData = new FormData();

  formData.append("file", ensureFileObjectConsistency(file));

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
    formData.append("files[]", ensureFileObjectConsistency(file), path);
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

/**
 * Sometimes file object might have had the type property defined manually with Object.defineProperty
 * and some browsers (namely firefox) can have problems reading it after the file has been appended
 * to form data. To overcome this, we recreate the file object using native File constructor with
 * a type defined as a constructor argument.
 * Related issue: https://github.com/NebulousLabs/skynet-webportal/issues/290
 */
function ensureFileObjectConsistency(file) {
  return new File([file], file.name, { type: file.type });
}
