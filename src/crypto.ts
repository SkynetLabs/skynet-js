import * as blake2 from "blake2";

// hashAll takes a list of string parameters and hashes them using the 'blake2b'
// hasing function. The return value is a hex representation of that hash.
export function hashAll(...args: string[]): string {
  const h = blake2.createHash("blake2b");
  for (const arg of args) {
    h.update(Buffer.from(arg));
  }
  return h.digest("hex");
}
