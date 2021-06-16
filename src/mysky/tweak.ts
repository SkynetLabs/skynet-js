import { hashAll } from "../crypto";
import { stringToUint8ArrayUtf8, toHexString } from "../utils/string";

const discoverableBucketTweakVersion = 1;

export class DiscoverableBucketTweak {
  version: number;
  path: Array<Uint8Array>;

  constructor(path: string) {
    const paths = splitPath(path);
    const pathHashes = paths.map(hashPathComponent);
    this.version = discoverableBucketTweakVersion;
    this.path = pathHashes;
  }

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
export function hashPathComponent(component: string): Uint8Array {
  return hashAll(stringToUint8ArrayUtf8(component));
}

/**
 * Derives the discoverable file tweak for the given path.
 *
 * @param path - The given path.
 * @returns - The hex-encoded tweak.
 */
export function deriveDiscoverableTweak(path: string): string {
  const dbt = new DiscoverableBucketTweak(path);
  const bytes = dbt.getHash();
  return toHexString(bytes);
}
