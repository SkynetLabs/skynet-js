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

export async function extractDomain(this: SkynetClient, fullDomain: string): Promise<string> {
  const portalUrl = await this.portalUrl();

  return extractDomainForPortal(portalUrl, fullDomain);
}

/**
 * Create a new popup window. From SkyID.
 */
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
