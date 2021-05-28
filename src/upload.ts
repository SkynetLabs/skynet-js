import { AxiosResponse } from "axios";
import { Buffer } from "buffer";
import { Upload } from "tus-js-client";

import { getFileMimeType } from "./utils/file";
import { BaseCustomOptions, defaultBaseOptions } from "./utils/options";
import { formatSkylink } from "./skylink/format";
import { buildRequestHeaders, buildRequestUrl, SkynetClient } from "./client";
import {
  throwValidationError,
  validateNumber,
  validateObject,
  validateOptionalObject,
  validateString,
} from "./utils/validation";
import { toHexString, trimSuffix } from "./utils/string";
import { SiaSkylink } from "./skylink/sia";

// 4MiB * dataPieces - encryptionOverhead, set in skyd.
const DEFAULT_TUS_CHUNK_SIZE = (1 << 22) * 10;

const DEFAULT_TUS_RETRY_DELAYS = [0, 3000, 5000, 10000, 20000];

/**
 * Custom upload options.
 *
 * @property [endpointUpload] - The relative URL path of the portal endpoint to contact.
 * @property [portalFileFieldname="file"] - The file fieldname for uploading files on this portal.
 * @property [portalDirectoryfilefieldname="files[]"] - The file fieldname for uploading directories on this portal.
 * @property [customFilename] - The custom filename to use when uploading files.
 * @property [query] - Query parameters. Allows passing in parameters that haven't been implemented in the SDK yet.
 */
export type CustomUploadOptions = BaseCustomOptions & {
  endpointUpload?: string;
  portalFileFieldname?: string;
  portalDirectoryFileFieldname?: string;
  customFilename?: string;
  query?: Record<string, unknown>;
};

/**
 * Custom large upload options.
 *
 * @property [endpointLargeUpload] - The relative URL path of the portal endpoint to contact.
 */
export type CustomLargeUploadOptions = BaseCustomOptions & {
  endpointLargeUpload?: string;
  endpointLargeUploadId?: string;
  customFilename?: string;
  chunkSize?: number;
  retryDelays?: number[];
};

/**
 * The response to an upload request.
 *
 * @property skylink - 46-character skylink.
 * @property merkleroot - The hash that is encoded into the skylink.
 * @property bitfield - The bitfield that gets encoded into the skylink. The bitfield contains a version, an offset and a length in a heavily compressed and optimized format.
 */
export type UploadRequestResponse = {
  skylink: string;
  merkleroot: string;
  bitfield: number;
};

export const defaultUploadOptions = {
  ...defaultBaseOptions,
  endpointUpload: "/skynet/skyfile",
  portalFileFieldname: "file",
  portalDirectoryFileFieldname: "files[]",
  customFilename: "",
  query: undefined,
};

export const defaultLargeUploadOptions = {
  ...defaultBaseOptions,
  endpointLargeUpload: "/skynet/tus",
  endpointLargeUploadId: "/skynet/upload/tus",
  chunkSize: DEFAULT_TUS_CHUNK_SIZE,
  retryDelays: DEFAULT_TUS_RETRY_DELAYS,
};

/**
 * Uploads a file to Skynet.
 *
 * @param this - SkynetClient
 * @param file - The file to upload.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @param [customOptions.endpointPath="/skynet/tus"] - The relative URL path of the portal endpoint to contact.
 * @returns - The returned skylink.
 * @throws - Will throw if the request is successful but the upload response does not contain a complete response.
 */
export async function uploadFile(
  this: SkynetClient,
  file: File,
  customOptions?: CustomUploadOptions
): Promise<UploadRequestResponse> {
  // Validation is done in `uploadFileRequest`.

  const response = await this.uploadFileRequest(file, customOptions);

  // Sanity check.
  validateUploadResponse(response);

  const skylink = formatSkylink(response.data.skylink);
  const merkleroot = response.data.merkleroot;
  const bitfield = response.data.bitfield;

  return { skylink, merkleroot, bitfield };
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
): Promise<AxiosResponse> {
  validateFile("file", file, "parameter");
  validateOptionalObject("customOptions", customOptions, "parameter", defaultUploadOptions);

  const opts = { ...defaultUploadOptions, ...this.customOptions, ...customOptions };
  const formData = new FormData();

  file = ensureFileObjectConsistency(file);
  if (opts.customFilename) {
    formData.append(opts.portalFileFieldname, file, opts.customFilename);
  } else {
    formData.append(opts.portalFileFieldname, file);
  }

  const response = await this.executeRequest({
    ...opts,
    endpointPath: opts.endpointUpload,
    method: "post",
    data: formData,
  });

  return response;
}

/**
 * Uploads a large file to Skynet using tus.
 *
 * @param this - SkynetClient
 * @param file - The file to upload.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @param [customOptions.endpointPath="/skynet/tus"] - The relative URL path of the portal endpoint to contact.
 * @returns - The returned skylink.
 * @throws - Will throw if the request is successful but the upload response does not contain a complete response.
 */
export async function uploadLargeFile(
  this: SkynetClient,
  // TODO: Change in Node?
  file: File,
  customOptions?: CustomLargeUploadOptions
): Promise<UploadRequestResponse> {
  // Validation is done in `uploadLargeFileRequest`.

  const response = await this.uploadLargeFileRequest(file, customOptions);

  // Sanity check.
  validateLargeUploadResponse(response);

  // Get the skylink.
  const metadata = response.headers["upload-metadata"];
  // Convert the string metadata header into a map.
  const metadataMap: Map<string, string> = new Map(metadata.split(",").map((pair: string) => pair.split(" ")));
  let skylink = metadataMap.get("Skylink");
  // Validate that metadata contains Skylink.
  if (!skylink) {
    throw new Error("Response header 'upload-metadata' missing 'Skylink' field");
  }
  skylink = Buffer.from(skylink, "base64").toString("utf-8");

  // Get the remaining fields.
  const siaSkylink = SiaSkylink.fromString(skylink);
  const merkleroot = toHexString(siaSkylink.merkleRoot);
  const bitfield = siaSkylink.bitfield;

  // Format the skylink.
  skylink = formatSkylink(skylink);

  return { skylink, merkleroot, bitfield };
}

/**
 * Makes a request to upload a file to Skynet.
 *
 * @param this - SkynetClient
 * @param file - The file to upload.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @param [customOptions.endpointPath="/skynet/tus"] - The relative URL path of the portal endpoint to contact.
 * @returns - The upload response.
 */
export async function uploadLargeFileRequest(
  this: SkynetClient,
  file: File,
  customOptions?: CustomLargeUploadOptions
): Promise<AxiosResponse> {
  // TODO: Accept Buffer in Node?
  // validateFile("file", file, "parameter");
  validateOptionalObject("customOptions", customOptions, "parameter", defaultLargeUploadOptions);

  const opts = { ...defaultLargeUploadOptions, ...this.customOptions, ...customOptions };

  // TODO: Add back upload options once they are implemented in skyd.
  const url = await buildRequestUrl(this, opts.endpointLargeUpload);
  const headers = buildRequestHeaders(opts.customUserAgent, opts.customCookie);

  file = ensureFileObjectConsistency(file);
  let filename = file.name;
  if (opts.customFilename) {
    filename = opts.customFilename;
  }
  // TODO: Authorization?
  // TODO: Do we have to enable cross-site cookies?

  const onProgress =
    opts.onUploadProgress &&
    function (bytesSent: number, bytesTotal: number) {
      const progress = bytesSent / bytesTotal;

      // @ts-expect-error TS complains.
      opts.onUploadProgress(progress, { loaded: bytesSent, total: bytesTotal });
    };

  return new Promise((resolve, reject) => {
    const tusOpts = {
      endpoint: url,
      chunkSize: opts.chunkSize,
      retryDelays: opts.retryDelays,
      metadata: {
        filename,
        filetype: file.type,
      },
      headers,
      onProgress,
      onError: (error: Error) => {
        reject(error);
      },
      onSuccess: async () => {
        if (!upload.url) {
          reject(new Error("'upload.url' was not set"));
          return;
        }

        // Extract the location from the URL.
        const [location] = trimSuffix(upload.url, "/").split("/").slice(-1);
        // Call HEAD to get the metadata, including the skylink.
        const resp = await this.executeRequest({
          ...opts,
          endpointPath: opts.endpointLargeUpload,
          method: "head",
          headers: { ...headers, "Tus-Resumable": "1.0.0" },
          extraPath: location,
        });
        resolve(resp);
      },
    };

    const upload = new Upload(file, tusOpts);
    upload.start();
  });
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
 * @throws - Will throw if the request is successful but the upload response does not contain a complete response.
 */
export async function uploadDirectory(
  this: SkynetClient,
  directory: Record<string, File>,
  filename: string,
  customOptions?: CustomUploadOptions
): Promise<UploadRequestResponse> {
  // Validation is done in `uploadDirectoryRequest`.

  const response = await this.uploadDirectoryRequest(directory, filename, customOptions);

  // Sanity check.
  validateUploadResponse(response);

  const skylink = formatSkylink(response.data.skylink);
  const merkleroot = response.data.merkleroot;
  const bitfield = response.data.bitfield;

  return { skylink, merkleroot, bitfield };
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
 * @throws - Will throw if the input filename is not a string.
 */
export async function uploadDirectoryRequest(
  this: SkynetClient,
  directory: Record<string, File>,
  filename: string,
  customOptions?: CustomUploadOptions
): Promise<AxiosResponse> {
  validateObject("directory", directory, "parameter");
  validateString("filename", filename, "parameter");
  validateOptionalObject("customOptions", customOptions, "parameter", defaultUploadOptions);

  const opts = { ...defaultUploadOptions, ...this.customOptions, ...customOptions };

  const formData = new FormData();
  Object.entries(directory).forEach(([path, file]) => {
    file = ensureFileObjectConsistency(file as File);
    formData.append(opts.portalDirectoryFileFieldname, file as File, path);
  });

  const response = await this.executeRequest({
    ...opts,
    endpointPath: opts.endpointUpload,
    method: "post",
    data: formData,
    query: { filename },
  });

  return response;
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

/**
 * Validates the given value as a file.
 *
 * @param name - The name of the value.
 * @param value - The actual value.
 * @param valueKind - The kind of value that is being checked (e.g. "parameter", "response field", etc.)
 * @throws - Will throw if not a valid file.
 */
function validateFile(name: string, value: unknown, valueKind: string) {
  if (!(value instanceof File)) {
    throwValidationError(name, value, valueKind, "'File'");
  }
}

/**
 * Validates the upload response.
 *
 * @param response - The upload response.
 * @throws - Will throw if not a valid upload response.
 */
function validateUploadResponse(response: AxiosResponse): void {
  try {
    if (!response.data) {
      throw new Error("response.data field missing");
    }

    validateString("skylink", response.data.skylink, "upload response field");
    validateString("merkleroot", response.data.merkleroot, "upload response field");
    validateNumber("bitfield", response.data.bitfield, "upload response field");
  } catch (err) {
    throw new Error(
      `Did not get a complete upload response despite a successful request. Please try again and report this issue to the devs if it persists. Error: ${err}`
    );
  }
}

/**
 * Validates the large upload response.
 *
 * @param response - The upload response.
 * @throws - Will throw if not a valid upload response.
 */
function validateLargeUploadResponse(response: AxiosResponse): void {
  try {
    if (!response.headers) {
      throw new Error("response.headers field missing");
    }

    const metadata = response.headers["upload-metadata"];
    validateString('response.headers["upload-metadata"]', metadata, "upload response field");
  } catch (err) {
    throw new Error(
      `Did not get a complete upload response despite a successful request. Please try again and report this issue to the devs if it persists. Error: ${err}`
    );
  }
}
