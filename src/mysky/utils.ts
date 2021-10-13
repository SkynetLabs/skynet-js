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

/* istanbul ignore next */
/**
 * Create a new popup window. From SkyID.
 *
 * @param url - The URL to open.
 * @param winName - The name of the popup window.
 * @param w - The width of the popup window.
 * @param h - the height of the popup window.
 * @returns - The window.
 * @throws - Will throw if the window could not be opened.
 */
export function popupCenter(url: string, winName: string, w: number, h: number): Window {
  if (!window.top) {
    throw new Error("Current window is not valid");
  }

  url = ensureUrl(url);

  const y = window.top.outerHeight / 2 + window.top.screenY - h / 2;
  const x = window.top.outerWidth / 2 + window.top.screenX - w / 2;

  const newWindow = window.open(
    url,
    winName,
    `toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=yes, copyhistory=no, width=${w}, height=${h}, top=${y}, left=${x}`
  );
  if (!newWindow) {
    throw new Error("Could not open window");
  }

  if (newWindow.focus) {
    newWindow.focus();
  }
  return newWindow;
}
