import { ensureUrl } from "skynet-mysky-utils";

import { SkynetClient } from "../client";
import { getFullDomainUrlForPortal, extractDomainForPortal } from "../utils/url";

/**
 * Constructs the full URL for the given component domain,
 * e.g. "dac.hns" => "https://dac.hns.siasky.net"
 *
 * @param this - SkynetClient
 * @param domain - Component domain.
 * @returns - The full URL for the component.
 */
export async function getFullDomainUrl(this: SkynetClient, domain: string): Promise<string> {
  const portalUrl = await this.portalUrl();

  return getFullDomainUrlForPortal(portalUrl, domain);
}

/**
 * Extracts the domain from the current portal URL,
 * e.g. ("dac.hns.siasky.net") => "dac.hns"
 *
 * @param this - SkynetClient
 * @param fullDomain - Full URL.
 * @returns - The extracted domain.
 */
export async function extractDomain(this: SkynetClient, fullDomain: string): Promise<string> {
  const portalUrl = await this.portalUrl();

  return extractDomainForPortal(portalUrl, fullDomain);
}

/**
 * To prevent analysis that can occur by looking at the sizes of files, all
 * encrypted files will be padded to the nearest "pad block" (after encryption).
 * A pad block is minimally 4 kib in size, is always a power of 2, and is always
 * at least 5% of the size of the file.
 *
 * For example, a 1 kib encrypted file would be padded to 4 kib, a 5 kib file
 * would be padded to 8 kib, and a 105 kib file would be padded to 112 kib.
 * Below is a short table of valid file sizes:
 *
 * ```
 *   4 KiB      8 KiB     12 KiB     16 KiB     20 KiB
 *  24 KiB     28 KiB     32 KiB     36 KiB     40 KiB
 *  44 KiB     48 KiB     52 KiB     56 KiB     60 KiB
 *  64 KiB     68 KiB     72 KiB     76 KiB     80 KiB
 *
 *  88 KiB     96 KiB    104 KiB    112 KiB    120 KiB
 * 128 KiB    136 KiB    144 KiB    152 KiB    160 KiB
 *
 * 176 KiB    192 Kib    208 KiB    224 KiB    240 KiB
 * 256 KiB    272 KiB    288 KiB    304 KiB    320 KiB
 *
 * 352 KiB    ... etc
 * ```
 *
 * Note that the first 20 valid sizes are all a multiple of 4 KiB, the next 10
 * are a multiple of 8 KiB, and each 10 after that the multiple doubles. We use
 * this method of padding files to prevent an adversary from guessing the
 * contents or structure of the file based on its size.
 */
export function padFileSize(initialSize: number): number {
  const kib = 1 << 10;
  for (let n = 0; ; n++) {
    // Prevent overflow. Max JS number size is 2^53-1.
    if (n >= 53) {
      throw new Error("Could not pad file size, overflow detected.");
    }
    if (initialSize <= (1 << n) * 80 * kib) {
      const paddingBlock = (1 << n) * 4 * kib;
      let finalSize = initialSize;
      if (finalSize % paddingBlock != 0) {
        finalSize = initialSize - (initialSize % paddingBlock) + paddingBlock;
      }
      return finalSize;
    }
  }
}

/**
 * Create a new popup window. From SkyID.
 *
 * @param url - The URL to open.
 * @param title - The title of the popup window.
 * @param w - The width of the popup window.
 * @param h - the height of the popup window.
 * @returns - The window.
 */
/* istanbul ignore next */
export function popupCenter(url: string, title: string, w: number, h: number): Window {
  url = ensureUrl(url);

  // Fixes dual-screen position                             Most browsers      Firefox
  const dualScreenLeft = window.screenLeft !== undefined ? window.screenLeft : window.screenX;
  const dualScreenTop = window.screenTop !== undefined ? window.screenTop : window.screenY;

  const width = window.innerWidth
    ? window.innerWidth
    : document.documentElement.clientWidth
    ? document.documentElement.clientWidth
    : screen.width;
  const height = window.innerHeight
    ? window.innerHeight
    : document.documentElement.clientHeight
    ? document.documentElement.clientHeight
    : screen.height;

  const systemZoom = width / window.screen.availWidth;
  const left = (width - w) / 2 / systemZoom + dualScreenLeft;
  const top = (height - h) / 2 / systemZoom + dualScreenTop;
  const newWindow = window.open(
    url,
    title,
    `
scrollbars=yes,
width=${w / systemZoom},
height=${h / systemZoom},
top=${top},
left=${left}
`
  );
  if (!newWindow) {
    throw new Error("could not open window");
  }

  if (newWindow.focus) {
    newWindow.focus();
  }
  return newWindow;
}
