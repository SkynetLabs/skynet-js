import axios from "axios";

import { getRootDirectory, makeUrl, options } from "./utils.js";

export const defaultUploadOptions = {
  ...options,
  portalEndpointPath: "/skynet/skyfile",
  portalFileFieldname: "file",
  portalDirectoryFileFieldname: "files[]",
  // TODO:
  // customFilename: "",
  customDirname: "",
};

export async function upload(portalUrl, file, customOptions = {}) {
  const opts = { ...defaultUploadOptions, ...customOptions };

  const formData = new FormData();
  formData.append(opts.portalFileFieldname, ensureFileObjectConsistency(file));

  const url = makeUrl(portalUrl, opts.portalEndpointPath);

  const { data } = await axios.post(
    url,
    formData,
    opts.onUploadProgress && {
      onUploadProgress: ({ loaded, total }) => {
        const progress = loaded / total;

        opts.onUploadProgress(progress, { loaded, total });
      },
    }
  );

  return data;
}

export async function uploadDirectory(portalUrl, directory, customOptions = {}) {
  const opts = { ...defaultUploadOptions, ...customOptions };

  const formData = new FormData();
  Object.entries(directory).forEach(([path, file]) => {
    formData.append(opts.portalDirectoryFileFieldname, ensureFileObjectConsistency(file), path);
  });

  var filename;
  if (opts.customDirname != "") {
    filename = opts.customDirname;
  }
  else {
    var file; for (file in directory) break;
    filename = getRootDirectory(directory[file]);
  }

  const url = makeUrl(portalUrl, opts.portalEndpointPath, { filename });

  const { data } = await axios.post(
    url,
    formData,
    opts.onUploadProgress && {
      onUploadProgress: ({ loaded, total }) => {
        const progress = loaded / total;

        opts.onUploadProgress(progress, { loaded, total });
      },
    }
  );

  return data;
}

/**
 * Sometimes file object might have had the type property defined manually with
 * Object.defineProperty and some browsers (namely firefox) can have problems
 * reading it after the file has been appended to form data. To overcome this,
 * we recreate the file object using native File constructor with a type defined
 * as a constructor argument.
 * Related issue: https://github.com/NebulousLabs/skynet-webportal/issues/290
 */
function ensureFileObjectConsistency(file) {
  return new File([file], file.name, { type: file.type });
}
