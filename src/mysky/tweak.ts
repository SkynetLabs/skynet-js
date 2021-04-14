import { fromByteArray } from "base64-js";
import { hashAll } from "../crypto";
import { stringToUint8ArrayUtf8 } from "../utils/string";

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

export function splitPath(path: string): Array<string> {
  return path.split("/");
}

export function hashPathComponent(component: string): Uint8Array {
  return hashAll(stringToUint8ArrayUtf8(component));
}

export function deriveDiscoverableTweak(path: string): Uint8Array {
  const dbt = new DiscoverableBucketTweak(path);
  return dbt.getHash();
}
