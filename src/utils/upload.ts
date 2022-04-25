import { SkynetClient } from "../client";
import { retry } from "./retry";

export type uploadFN = () => Promise<{ skylink: string }>;

/**
 * Executes the given upload function but does this in a blocking fashion. It
 * will do that by trying to download the resulting skylink in a retry
 * mechanism.
 *
 * @param uploadFn - The upload function
 * @param client - The skynet client
 * @returns skylink
 */
export async function uploadBlocking(uploadFn: uploadFN, client: SkynetClient): Promise<string> {
  let skylink: string;

  try {
    const res = await uploadFn();
    skylink = res.skylink;
  } catch (e) {
    console.log("upload failed", e);
    throw e;
  }

  const url = await client.getSkylinkUrl(skylink);
  const context = `blocking upload ${skylink}, downloading from ${url}`;

  try {
    await retry(() => client.getFileContent(skylink), context + "(getFileContent)");

    // @ts-expect-error Calling a private method.
    await retry(() => client.getFileContentRequest(url), context + "(getFileContentRequest)");

    return skylink;
  } catch (e) {
    console.log("download after upload failed", skylink);
    throw e;
  }
}
