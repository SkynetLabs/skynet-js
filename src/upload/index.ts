import { defaultOptions, BaseCustomOptions } from "../utils";

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
  ...defaultOptions("/skynet/skyfile"),
  portalFileFieldname: "file",
  portalDirectoryFileFieldname: "files[]",
  customFilename: "",
};
