import { defaultOptions, uriSkynetPrefix, getFileMimeType, BaseCustomOptions } from "./utils";
import { SkynetClient } from "./client";

/**
 * Custom upload options.
 *
 * @property [portalFileFieldname="file"] - The file fieldname for uploading files on this portal.
 * @property [portalDirectoryfilefieldname="files[]"] - The file fieldname for uploading directories on this portal.
 * @property [customFilename] - The custom filename to use when uploading files.
 * @property [query] - Query parameters.
 */
export type CustomUploadOptions = BaseCustomOptions & {
  portalFileFieldname?: string;
  portalDirectoryFileFieldname?: string;
  customFilename?: string;
  query?: Record<string, unknown>;
};

/**
 * The response to an upload request.
 *
 * @property skylink - 46-character skylink.
 */
export type UploadRequestResponse = {
  skylink: string;
};

const defaultUploadOptions = {
  ...defaultOptions("/skynet/skyfile"),
  portalFileFieldname: "file",
  portalDirectoryFileFieldname: "files[]",
  customFilename: "",
};

/**
 * Uploads a file to Skynet.
 *
 * @param this - SkynetClient
 * @param file - The file to upload.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @param [customOptions.endpointPath="/skynet/skyfile"] - The relative URL path of the portal endpoint to contact.
 * @returns - The returned skylink.
 */
export async function uploadFile(this: SkynetClient, file: File, customOptions?: CustomUploadOptions): Promise<string> {
  const response = await this.uploadFileRequest(file, customOptions);

  return `${uriSkynetPrefix}${response.skylink}`;
}

/**
 * Makes a request to upload a file to Skynet.
 *
 * @param this - SkynetClient
 * @param file - The file to upload.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @param [customOptions.endpointPath="/skynet/skyfile"] - The relative URL path of the portal endpoint to contact.
 * @returns - The upload response.
 */
export async function uploadFileRequest(
  this: SkynetClient,
  file: File,
  customOptions?: CustomUploadOptions
): Promise<UploadRequestResponse> {
  const opts = { ...defaultUploadOptions, ...this.customOptions, ...customOptions };
  const formData = new FormData();

  file = ensureFileObjectConsistency(file);
  if (opts.customFilename) {
    formData.append(opts.portalFileFieldname, file, opts.customFilename);
  } else {
    formData.append(opts.portalFileFieldname, file);
  }

  const { data } = await this.executeRequest({
    ...opts,
    method: "post",
    data: formData,
  });

  return data;
}

/**
 * Uploads a directory to Skynet.
 *
 * @param this - SkynetClient
 * @param directory - File objects to upload, indexed by their path strings.
 * @param filename - The name of the directory.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @param [customOptions.endpointPath="/skynet/skyfile"] - The relative URL path of the portal endpoint to contact.
 * @returns - The returned skylink.
 */
export async function uploadDirectory(
  this: SkynetClient,
  directory: Record<string, File>,
  filename: string,
  customOptions?: CustomUploadOptions
): Promise<string> {
  const response = await this.uploadDirectoryRequest(directory, filename, customOptions);

  return `${uriSkynetPrefix}${response.skylink}`;
}

/**
 * Makes a request to upload a directory to Skynet.
 *
 * @param this - SkynetClient
 * @param directory - File objects to upload, indexed by their path strings.
 * @param filename - The name of the directory.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @param [customOptions.endpointPath="/skynet/skyfile"] - The relative URL path of the portal endpoint to contact.
 * @returns - The upload response.
 */
export async function uploadDirectoryRequest(
  this: SkynetClient,
  directory: Record<string, File>,
  filename: string,
  customOptions?: CustomUploadOptions
): Promise<UploadRequestResponse> {
  const opts = { ...defaultUploadOptions, ...this.customOptions, ...customOptions };
  const formData = new FormData();

  Object.entries(directory).forEach(([path, file]) => {
    file = ensureFileObjectConsistency(file as File);
    formData.append(opts.portalDirectoryFileFieldname, file as File, path);
  });

  const { data } = await this.executeRequest({
    ...opts,
    method: "post",
    data: formData,
    query: { filename },
  });

  return data;
}

/**
 * Sometimes file object might have had the type property defined manually with
 * Object.defineProperty and some browsers (namely firefox) can have problems
 * reading it after the file has been appended to form data. To overcome this,
 * we recreate the file object using native File constructor with a type defined
 * as a constructor argument.
 *
 * @param file - The input file.
 * @returns - The processed file.
 * @see {@link https://github.com/NebulousLabs/skynet-webportal/issues/290| Related Issue}
 */
function ensureFileObjectConsistency(file: File): File {
  return new File([file], file.name, { type: getFileMimeType(file) });
}
