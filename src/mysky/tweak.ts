import { hash } from "tweetnacl";

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
    const size = 1 + 64 * this.path.length;
    const buf = new Uint8Array(size);

    buf.set([this.version]);
    let offset = 1;
    for (const pathLevel of this.path) {
      buf.set(pathLevel, offset);
      offset += 64;
    }
    return buf;
  }

  getHash(): Uint8Array {
    const encoding = this.encode();
    return hash(encoding);
  }
}

export function splitPath(path: string): Array<string> {
  return path.split("/");
}

export function hashPathComponent(component: string): Uint8Array {
  return hash(stringToUint8ArrayUtf8(component));
}

export function deriveDiscoverableTweak(path: string): string {
  const dbt = new DiscoverableBucketTweak(path);
  const bytes = dbt.getHash();
  return toHexString(bytes);
}
