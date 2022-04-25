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
  const { skylink } = await uploadFn();
  await retry(() => client.getFileContent(skylink));

  const url = await client.getSkylinkUrl(skylink);
  // @ts-expect-error Calling a private method.
  await retry(() => client.getFileContentRequest(url));

  return skylink;
}
