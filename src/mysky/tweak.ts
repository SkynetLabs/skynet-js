import { hashAll } from "../crypto";
import { stringToUint8ArrayUtf8, toHexString } from "../utils/string";

const DISCOVERABLE_BUCKET_TWEAK_VERSION = 1;

/**
 * Derives the discoverable file tweak for the given path.
 *
 * @param path - The given path.
 * @returns - The hex-encoded tweak.
 */
export function deriveDiscoverableFileTweak(path: string): string {
  const dbt = new DiscoverableBucketTweak(path);
  const bytes = dbt.getHash();
  return toHexString(bytes);
}

/**
 * The tweak for the discoverable bucket for the given path.
 */
export class DiscoverableBucketTweak {
  version: number;
  path: Array<Uint8Array>;

  /**
   * Creates a new `DiscoverableBucketTweak`.
   *
   * @param path - The MySky data path.
   */
  constructor(path: string) {
    const paths = splitPath(path);
    const pathHashes = paths.map(hashPathComponent);
    this.version = DISCOVERABLE_BUCKET_TWEAK_VERSION;
    this.path = pathHashes;
  }

  /**
   * Encodes the tweak into a byte array.
   *
   * @returns - The encoded byte array.
   */
  encode(): Uint8Array {
    const size = 1 + 32 * this.path.length;
    const buf = new Uint8Array(size);

    buf.set([this.version]);
    let offset = 1;
    for (const pathLevel of this.path) {
      buf.set(pathLevel, offset);
      offset += 32;
    }
    return buf;
  }

  /**
   * Gets the hash of the tweak.
   *
   * @returns - The hash.
   */
  getHash(): Uint8Array {
    const encoding = this.encode();
    return hashAll(encoding);
  }
}

/**
 * Splits the path by forward slashes.
 *
 * @param path - The path to split.
 * @returns - An array of path components.
 */
export function splitPath(path: string): Array<string> {
  return path.split("/");
}

/**
 * Hashes the path component.
 *
 * @param component - The component extracted from the path.
 * @returns - The hash.
 */
// TODO: Can we replace with hashString?
export function hashPathComponent(component: string): Uint8Array {
  return hashAll(stringToUint8ArrayUtf8(component));
}
