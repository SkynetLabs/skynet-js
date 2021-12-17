import mime from "mime/lite";
import path from "path-browserify";

import { trimPrefix } from "./string";

/**
 * Gets the path for the file.
 *
 * @param file - The file.
 * @returns - The path.
 */
function getFilePath(
  file: File & {
    webkitRelativePath?: string;
    path?: string;
  }
): string {
  /* istanbul ignore next */
  return file.webkitRelativePath || file.path || file.name;
}

/**
 * Gets the file path relative to the root directory of the path, e.g. `bar` in `/foo/bar`.
 *
 * @param file - The input file.
 * @returns - The relative file path.
 */
export function getRelativeFilePath(file: File): string {
  const filePath = getFilePath(file);
  const { root, dir, base } = path.parse(filePath);
  const relative = path.normalize(dir).slice(root.length).split(path.sep).slice(1);

  return path.join(...relative, base);
}

/**
 * Gets the root directory of the file path, e.g. `foo` in `/foo/bar`.
 *
 * @param file - The input file.
 * @returns - The root directory.
 */
export function getRootDirectory(file: File): string {
  const filePath = getFilePath(file);
  const { root, dir } = path.parse(filePath);

  return path.normalize(dir).slice(root.length).split(path.sep)[0];
}

/**
 * Get the file mime type. In case the type is not provided, try to guess the
 * file type based on the extension.
 *
 * @param file - The file.
 * @returns - The mime type.
 */
export function getFileMimeType(file: File): string {
  if (file.type) return file.type;
  let ext = path.extname(file.name);
  ext = trimPrefix(ext, ".");
  if (ext !== "") {
    const mimeType = mime.getType(ext);
    if (mimeType) {
      return mimeType;
    }
  }
  return "";
}
