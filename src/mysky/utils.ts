import { SkynetClient } from "../client";
import { trimSuffix } from "../utils/string";
import { getFullDomainUrlForPortal, extractDomainForPortal, ensureUrlPrefix } from "../utils/url";

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
 * Gets the URL for the current skapp on the preferred portal, if we're not on
 * the preferred portal already.
 *
 * @param currentPortalUrl - The current portal URL.
 * @param currentUrl - The current page URL.
 * @param preferredPortalUrl - The preferred portal URL.
 * @returns - The URL for the current skapp on the preferred portal.
 */
export function getRedirectUrlOnPreferredPortal(
  currentPortalUrl: string,
  currentUrl: string,
  preferredPortalUrl: string
): string {
  // Get the current skapp on the preferred portal.
  const skappDomain = extractDomainForPortal(currentPortalUrl, currentUrl);
  return getFullDomainUrlForPortal(preferredPortalUrl, skappDomain);
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

  url = ensureUrlPrefix(url);

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

// TODO: Handle edge cases with specific servers as preferred portal?
/**
 * Returns whether we should redirect from the current portal to the preferred
 * portal. The protocol prefixes are allowed to be different and there can be
 * other differences like a trailing slash.
 *
 * @param currentPortalUrl - The current portal URL.
 * @param preferredPortalUrl - The preferred portal URL.
 * @returns - Whether the two URLs are equal for the purposes of redirecting.
 */
export function shouldRedirectToPreferredPortalUrl(currentPortalUrl: string, preferredPortalUrl: string): boolean {
  // Strip protocol and trailing slash (case-insensitive).
  currentPortalUrl = trimSuffix(currentPortalUrl.replace(/https:\/\/|http:\/\//i, ""), "/");
  preferredPortalUrl = trimSuffix(preferredPortalUrl.replace(/https:\/\/|http:\/\//i, ""), "/");
  return currentPortalUrl === preferredPortalUrl;
}
