/* istanbul ignore file: Much of this functionality is only testable from a browser */

export type { CustomConnectorOptions } from "./connector";
export { DacLibrary } from "./dac";

import { Connection, ParentHandshake, WindowMessenger } from "post-me";
import {
  CheckPermissionsResponse,
  dispatchedErrorEvent,
  errorWindowClosed,
  monitorWindowError,
  PermCategory,
  Permission,
  PermType,
} from "skynet-mysky-utils";

import { Connector, CustomConnectorOptions, DEFAULT_CONNECTOR_OPTIONS } from "./connector";
import { SkynetClient } from "../client";
import { DacLibrary } from "./dac";
import { RegistryEntry } from "../registry";
import { Signature } from "../crypto";
import { getRedirectUrlOnPreferredPortal, popupCenter, shouldRedirectToPreferredPortalUrl } from "./utils";
import { validateBoolean, validateString } from "../utils/validation";
import {
  deleteEntryData as deleteEntryDataV2,
  deleteJSON as deleteJSONV2,
  getEntryData as getEntryDataV2,
  getEntryLink as getEntryLinkV2,
  getJSONEncrypted as getJSONEncryptedV2,
  getJSON as getJSONV2,
  setDataLink as setDataLinkV2,
  setEntryData as setEntryDataV2,
  setJSONEncrypted as setJSONEncryptedV2,
  setJSON as setJSONV2,
} from "./skydb_v2";
// These imports are deprecated but they are needed for the v1 MySky SkyDB
// methods, which we are keeping so as not to break compatibility.
import {
  deleteEntryData,
  deleteJSON,
  getEntryData,
  getEntryLink,
  getJSON,
  getJSONEncrypted,
  setDataLink,
  setEntryData,
  setJSON,
  setJSONEncrypted,
} from "./skydb";
import { trimForwardSlash } from "../utils/string";

/**
 * The domain for MySky.
 */
export const MYSKY_DOMAIN = "skynet-mysky.hns";

/**
 * @deprecated please use MYSKY_DOMAIN.
 */
export const mySkyDomain = MYSKY_DOMAIN;

/**
 * The domain for MySky dev.
 */
export const MYSKY_DEV_DOMAIN = "skynet-mysky-dev.hns";

/**
 * @deprecated please use MYSKY_DEV_DOMAIN.
 */
export const mySkyDevDomain = MYSKY_DEV_DOMAIN;

/**
 * The domain for MySky alpha. Intentionally not exported in index file.
 */
export const MYSKY_ALPHA_DOMAIN = "sandbridge.hns";

/**
 * The maximum length for entry data when setting entry data.
 */
export const MAX_ENTRY_LENGTH = 70;

const mySkyUiRelativeUrl = "ui.html";
const mySkyUiTitle = "MySky UI";
const [mySkyUiW, mySkyUiH] = [640, 750];

export type EntryData = {
  data: Uint8Array | null;
};

/**
 * Loads MySky. Note that this does not log in the user.
 *
 * @param this - The Skynet client.
 * @param skappDomain - The domain of the host skapp. For this domain permissions will be requested and, by default, automatically granted.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - Loaded (but not logged-in) MySky instance.
 */
export async function loadMySky(
  this: SkynetClient,
  skappDomain?: string,
  customOptions?: CustomConnectorOptions
): Promise<MySky> {
  const mySky = await MySky.New(this, skappDomain, customOptions);

  return mySky;
}

/**
 * The singleton object that allows skapp developers to initialize and
 * communicate with MySky.
 */
export class MySky {
  static instance: MySky | null = null;

  // Holds the loaded DACs.
  dacs: DacLibrary[] = [];

  // Holds the currently granted permissions.
  grantedPermissions: Permission[] = [];

  // Holds permissions that have not been granted.
  pendingPermissions: Permission[];

  // ============
  // Constructors
  // ============

  /**
   * Creates a `MySky` instance.
   *
   * @param connector - The `Connector` object.
   * @param permissions - The initial requested permissions.
   * @param hostDomain - The domain of the host skapp.
   * @param skappIsOnPortal - Whether the current skapp is on a portal.
   */
  constructor(
    protected connector: Connector,
    permissions: Permission[],
    protected hostDomain: string,
    protected skappIsOnPortal: boolean
  ) {
    if (MySky.instance) {
      throw new Error("Trying to create a second MySky instance");
    }

    this.pendingPermissions = permissions;
  }

  /**
   * Initializes MySky and returns a `MySky` instance.
   *
   * @param client - The Skynet Client.
   * @param [skappDomain] - The domain of the host skapp.
   * @param [customOptions] - Additional settings that can optionally be set.
   * @returns - A `MySky` instance.
   */
  static async New(client: SkynetClient, skappDomain?: string, customOptions?: CustomConnectorOptions): Promise<MySky> {
    const opts = { ...DEFAULT_CONNECTOR_OPTIONS, ...customOptions };

    // Enforce singleton.
    if (MySky.instance) {
      return MySky.instance;
    }

    let domain = MYSKY_DOMAIN;
    if (opts.alpha && opts.dev) {
      throw new Error(
        `Cannot redirect to both Alpha MySky Domain and Dev MySky Domain. Please pass either the 'dev' or the 'alpha' option, not both.`
      );
    } else if (opts.alpha) {
      domain = MYSKY_ALPHA_DOMAIN;
    } else if (opts.dev) {
      domain = MYSKY_DEV_DOMAIN;
    }
    const connector = await Connector.init(client, domain, customOptions);

    let hostDomain;
    let skappIsOnPortal = false;
    if (window.location.hostname === "localhost") {
      hostDomain = "localhost";
    } else {
      // MySky expects to be on the same portal as the skapp, so create a new
      // client on the current skapp URL, in case the client the developer
      // instantiated does not correspond to the portal of the current URL.
      const currentUrlClient = new SkynetClient(window.location.hostname, client.customOptions);
      try {
        // Trigger a resolve of the portal URL manually. `new SkynetClient`
        // assumes a portal URL is given to it, so it doesn't make the request
        // for the actual portal URL.
        //
        // TODO: We should rework this so it is possible without protected
        // methods.
        //
        // @ts-expect-error - Using protected method.
        currentUrlClient.customPortalUrl = await currentUrlClient.resolvePortalUrl();
        skappIsOnPortal = true;
      } catch (e) {
        // Could not make a query for the portal URL, we are not on a portal.
        skappIsOnPortal = false;
      }

      // Get the host domain.
      if (skappIsOnPortal) {
        hostDomain = await currentUrlClient.extractDomain(window.location.hostname);
      } else {
        hostDomain = trimForwardSlash(window.location.hostname);
      }
    }

    // Extract the skapp domain.
    const permissions = [];
    if (skappDomain) {
      const perm1 = new Permission(hostDomain, skappDomain, PermCategory.Discoverable, PermType.Write);
      const perm2 = new Permission(hostDomain, skappDomain, PermCategory.Hidden, PermType.Read);
      const perm3 = new Permission(hostDomain, skappDomain, PermCategory.Hidden, PermType.Write);
      permissions.push(perm1, perm2, perm3);
    }

    MySky.instance = new MySky(connector, permissions, hostDomain, skappIsOnPortal);

    // Redirect if we're not on the preferred portal. See
    // `redirectIfNotOnPreferredPortal` for full load flow.
    //
    // TODO: Uncomment the below line once autologin is released. Otherwise the
    // dev console will be spammed with unactionable warnings.
    // try {
    //   await MySky.instance.redirectIfNotOnPreferredPortal();
    // } catch (e) {
    //   // Don't throw an error if we couldn't redirect. The user will never be
    //   // able to log in to MySky and change his preferred portal if MySky can't
    //   // load.
    //   //
    //   // TODO: Add some infrastructure to return warnings to the skapp instead
    //   // of errors?
    //   console.warn(e);
    // }

    return MySky.instance;
  }

  // ==========
  // Public API
  // ==========

  /**
   * Checks if the current browser is supported by MySky.
   *
   * @returns - A promise with a boolean indicating whether the browser is supported and, if not, a string containing the user-friendly error message.
   */
  static async isBrowserSupported(): Promise<[boolean, string]> {
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (isSafari) {
      return [false, "MySky is currently not supported in Safari browsers."];
    }

    return [true, ""];
  }

  /**
   * Loads the given DACs.
   *
   * @param dacs - The DAC library instances to call `init` on.
   */
  async loadDacs(...dacs: DacLibrary[]): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const dac of dacs) {
      promises.push(this.loadDac(dac));
    }

    this.dacs.push(...dacs);

    await Promise.all(promises);
  }

  /**
   * Adds the given permissions to the list of pending permissions.
   *
   * @param permissions - The list of permissions to add.
   */
  async addPermissions(...permissions: Permission[]): Promise<void> {
    this.pendingPermissions.push(...permissions);
  }

  /**
   * Checks whether main MySky, living in an invisible iframe, is already logged
   * in and all requested permissions are granted.
   *
   * @returns - A boolean indicating whether the user is logged in and all
   * permissions are granted.
   */
  async checkLogin(): Promise<boolean> {
    const [seedFound, permissionsResponse]: [boolean, CheckPermissionsResponse] = await this.connector.connection
      .remoteHandle()
      .call("checkLogin", this.pendingPermissions);

    // Save granted and failed permissions.
    const { grantedPermissions, failedPermissions } = permissionsResponse;
    this.grantedPermissions = grantedPermissions;
    this.pendingPermissions = failedPermissions;

    const loggedIn = seedFound && failedPermissions.length === 0;
    if (loggedIn) {
      await this.handleLogin();
    }
    return loggedIn;
  }

  /**
   * Destroys the mysky connection by:
   *
   * 1. Destroying the connected DACs.
   *
   * 2. Closing the connection.
   *
   * 3. Closing the child iframe.
   *
   * @throws - Will throw if there is an unexpected DOM error.
   */
  async destroy(): Promise<void> {
    // TODO: Make sure we are logged out first?

    // TODO: For all connected dacs, send a destroy call.

    // TODO: Delete all connected dacs.

    // Close the connection.
    this.connector.connection.close();

    // Close the child iframe.
    const frame = this.connector.childFrame;
    if (frame) {
      // The parent node should always exist. Sanity check + make TS happy.
      if (!frame.parentNode) {
        throw new Error("'childFrame.parentNode' was not set");
      }
      frame.parentNode.removeChild(frame);
    }
  }

  // TODO: Document what this does exactly.
  /**
   * Log out the user.
   *
   * @returns - An empty promise.
   */
  async logout(): Promise<void> {
    await this.connector.connection.remoteHandle().call("logout");

    // Remove auto-relogin if it's set.
    this.connector.client.customOptions.loginFn = undefined;
  }

  /**
   * Requests login access by opening the MySky UI window.
   *
   * @returns - A boolean indicating whether we successfully logged in and all
   * requested permissions were granted.
   */
  async requestLoginAccess(): Promise<boolean> {
    let uiWindow: Window;
    let uiConnection: Connection;
    let seedFound = false;

    // Add error listener.
    const { promise: promiseError, controller: controllerError } = monitorWindowError();

    // eslint-disable-next-line no-async-promise-executor
    const promise: Promise<void> = new Promise(async (resolve, reject) => {
      // Make this promise run in the background and reject on window close or any errors.
      promiseError.catch((err: string) => {
        if (err === errorWindowClosed) {
          // Resolve without updating the pending permissions.
          resolve();
          return;
        }

        reject(err);
      });

      try {
        // Launch and connect the UI.
        uiWindow = this.launchUI();
        uiConnection = await this.connectUi(uiWindow);

        // Send the UI the list of required permissions.
        //
        // TODO: This should be a dual-promise that also calls ping() on an interval and rejects if no response was found in a given amount of time.
        const [seedFoundResponse, permissionsResponse]: [boolean, CheckPermissionsResponse] = await uiConnection
          .remoteHandle()
          .call("requestLoginAccess", this.pendingPermissions);
        seedFound = seedFoundResponse;

        // Save failed permissions.
        const { grantedPermissions, failedPermissions } = permissionsResponse;
        this.grantedPermissions = grantedPermissions;
        this.pendingPermissions = failedPermissions;

        resolve();
      } catch (err) {
        reject(err);
      }
    });

    await promise
      .catch((err) => {
        throw err;
      })
      .finally(() => {
        // Close the window.
        if (uiWindow) {
          uiWindow.close();
        }
        // Close the connection.
        if (uiConnection) {
          uiConnection.close();
        }
        // Clean up the event listeners and promises.
        controllerError.cleanup();
      });

    const loggedIn = seedFound && this.pendingPermissions.length === 0;
    if (loggedIn) {
      await this.handleLogin();
    }
    return loggedIn;
  }

  /**
   * Returns the user ID (i.e. same as the user's public key).
   *
   * @returns - The hex-encoded user ID.
   */
  async userID(): Promise<string> {
    return await this.connector.connection.remoteHandle().call("userID");
  }

  // =============
  // SkyDB methods
  // =============

  // v1 (deprecated)
  getJSON = getJSON;
  getEntryLink = getEntryLink;
  setJSON = setJSON;
  deleteJSON = deleteJSON;
  setDataLink = setDataLink;
  getEntryData = getEntryData;
  setEntryData = setEntryData;
  deleteEntryData = deleteEntryData;
  getJSONEncrypted = getJSONEncrypted;
  setJSONEncrypted = setJSONEncrypted;

  // v2
  dbV2 = {
    getJSON: getJSONV2.bind(this),
    getEntryLink: getEntryLinkV2.bind(this),
    setJSON: setJSONV2.bind(this),
    deleteJSON: deleteJSONV2.bind(this),
    setDataLink: setDataLinkV2.bind(this),
    getEntryData: getEntryDataV2.bind(this),
    setEntryData: setEntryDataV2.bind(this),
    deleteEntryData: deleteEntryDataV2.bind(this),
    getJSONEncrypted: getJSONEncryptedV2.bind(this),
    setJSONEncrypted: setJSONEncryptedV2.bind(this),
  };

  /**
   * Lets you get the share-able path seed, which can be passed to
   * `file.getJSONEncrypted` (in file.ts). Requires Hidden Read permission on
   * the path.
   *
   * @param path - The given path.
   * @param isDirectory - Whether the path is a directory.
   * @returns - The seed for the path.
   * @throws - Will throw if the user does not have Hidden Read permission on the path.
   * @deprecated - This function has been deprecated in favor of `getEncryptedPathSeed`.
   */
  async getEncryptedFileSeed(path: string, isDirectory: boolean): Promise<string> {
    return await this.getEncryptedPathSeed(path, isDirectory);
  }

  /**
   * Lets you get the share-able path seed, which can be passed to
   * `file.getJSONEncrypted` (in file.ts). Requires Hidden Read permission on
   * the path.
   *
   * @param path - The given path.
   * @param isDirectory - Whether the path is a directory.
   * @returns - The seed for the path.
   * @throws - Will throw if the user does not have Hidden Read permission on the path.
   */
  async getEncryptedPathSeed(path: string, isDirectory: boolean): Promise<string> {
    validateString("path", path, "parameter");
    validateBoolean("isDirectory", isDirectory, "parameter");

    return await this.connector.connection.remoteHandle().call("getEncryptedFileSeed", path, isDirectory);
  }

  /**
   * signMessage will sign the given data using the MySky user's private key,
   * this method can be used for MySky user verification as the signature may be
   * verified against the user's public key, which is the MySky user id.
   *
   * @param message - message to sign
   * @returns signature
   */
  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    return await this.connector.connection.remoteHandle().call("signMessage", message);
  }

  /**
   * verifyMessageSignature verifies the signature for the message and given
   * public key and returns a boolean that indicates whether the verification
   * succeeded.
   *
   * @param message - the original message that was signed
   * @param signature - the signature
   * @param publicKey - the public key
   * @returns boolean that indicates whether the verification succeeded
   */
  async verifyMessageSignature(message: Uint8Array, signature: Uint8Array, publicKey: string): Promise<boolean> {
    return await this.connector.connection.remoteHandle().call("verifyMessageSignature", message, signature, publicKey);
  }

  // ================
  // Internal Methods
  // ================

  /**
   * Catches any errors returned from the UI and dispatches them in the current
   * window. This is how we bubble up errors from the MySky UI window to the
   * skapp.
   *
   * @param errorMsg - The error message.
   */
  protected async catchError(errorMsg: string): Promise<void> {
    const event = new CustomEvent(dispatchedErrorEvent, { detail: errorMsg });
    window.dispatchEvent(event);
  }

  /**
   * Checks if the MySky user can be logged into a portal account.
   *
   * @returns - Whether the user can be logged into a portal account.
   */
  protected async checkPortalLogin(): Promise<boolean> {
    return await this.connector.connection.remoteHandle().call("checkPortalLogin");
  }

  /**
   * Launches the MySky UI popup window.
   *
   * @returns - The window handle.
   * @throws - Will throw if the window could not be opened.
   */
  protected launchUI(): Window {
    const mySkyUrl = new URL(this.connector.url);
    mySkyUrl.pathname = mySkyUiRelativeUrl;
    const uiUrl = mySkyUrl.toString();

    // Open the window.

    const childWindow = popupCenter(uiUrl, mySkyUiTitle, mySkyUiW, mySkyUiH);
    if (!childWindow) {
      throw new Error(`Could not open window at '${uiUrl}'`);
    }

    return childWindow;
  }

  /**
   * Connects to the MySky UI window by establishing a postmessage handshake.
   *
   * @param childWindow - The MySky UI window.
   * @returns - The `Connection` with the other window.
   */
  protected async connectUi(childWindow: Window): Promise<Connection> {
    const options = this.connector.options;

    // Complete handshake with UI window.

    const messenger = new WindowMessenger({
      localWindow: window,
      remoteWindow: childWindow,
      remoteOrigin: "*",
    });
    const methods = {
      catchError: this.catchError,
    };
    const connection = await ParentHandshake(
      messenger,
      methods,
      options.handshakeMaxAttempts,
      options.handshakeAttemptsInterval
    );

    return connection;
  }

  /**
   * Gets the preferred portal from MySky, or `null` if not set.
   *
   * @returns - The preferred portal if set.
   */
  protected async getPreferredPortal(): Promise<string | null> {
    return await this.connector.connection.remoteHandle().call("getPreferredPortal");
  }

  /**
   * Loads the given DAC.
   *
   * @param dac - The dac to load.
   */
  protected async loadDac(dac: DacLibrary): Promise<void> {
    // Initialize DAC.
    await dac.init(this.connector.client, this.connector.options);

    // Add DAC permissions.
    const perms = dac.getPermissions();
    await this.addPermissions(...perms);
  }

  /**
   * Handles the after-login logic.
   */
  protected async handleLogin(): Promise<void> {
    // Call the `onUserLogin` hook for all DACs.
    await Promise.allSettled(
      this.dacs.map(async (dac) => {
        try {
          await dac.onUserLogin();
        } catch (error) {
          // Don't throw on error, just print a console warning.
          console.warn(error);
        }
      })
    );

    // Redirect if we're not on the preferred portal. See
    // `redirectIfNotOnPreferredPortal` for full login flow.
    //
    // TODO: Uncomment the below line once autologin is released. Otherwise the
    // dev console will be spammed with unactionable warnings.
    // try {
    //   await this.redirectIfNotOnPreferredPortal();
    //   // If we can log in to the portal account, set up auto-relogin.
    //   if (await this.checkPortalLogin()) {
    //     this.connector.client.customOptions.loginFn = this.portalLogin;
    //   } else {
    //     // Clear the old login function.
    //     this.connector.client.customOptions.loginFn = undefined;
    //   }
    // } catch (e) {
    //   // Don't throw an error if we couldn't redirect. The user will never be
    //   // able to log in to MySky and change his preferred portal if MySky can't
    //   // load.
    //   //
    //   // TODO: Add some infrastructure to return warnings to the skapp instead
    //   // of errors?
    //   console.warn(e);
    // }
  }

  /**
   * Logs in to the user's portal account.
   *
   * @returns - An empty promise.
   */
  protected async portalLogin(): Promise<void> {
    return await this.connector.connection.remoteHandle().call("portalLogin");
  }

  /**
   * Get the preferred portal and redirect the page if it is different than
   * the current portal.
   *
   *  Load MySky redirect flow:
   *
   *  1. SDK opens MySky on the same portal as the skapp.
   *  2. If a seed was not found, no preferred portal can be found, so exit the
   *     flow.
   *  3. MySky connects to siasky.net first.
   *  4. MySky tries to get the saved portal preference.
   *     1. If the portal is set, MySky switches to using the preferred portal.
   *     2. If it is not set or we don't have the seed, MySky switches to using
   *        the current portal as opposed to siasky.net.
   *  5. After MySky finishes loading, SDK queries `mySky.getPortalPreference`.
   *  6. If we are on a portal, and the preferred portal is set and different
   *     than the current portal, SDK triggers redirect to the new portal.
   *  7. We go back to step 1 and repeat, but since we're on the right portal
   *     now we won't refresh in step 6.
   *
   * Login redirect flow:
   *
   * 1. SDK logs in through the UI.
   * 2. MySky switches to siasky.net and tries to get the saved portal
   *    preference.
   *    1. If the portal is set, MySky switches to using the preferred portal.
   *    2. If it is not set or we don't have the seed, MySky switches to using
   *       the current portal as opposed to siasky.net.
   * 3. SDK queries `mySky.getPortalPreference`.
   * 4. If the preferred portal is set and different than the current portal,
   *    SDK triggers refresh.
   * 5. We go to "Load MySky" step 1 and go through that flow, but we don't
   *    refresh in step 6.
   */
  protected async redirectIfNotOnPreferredPortal(): Promise<void> {
    if (this.hostDomain === "localhost") {
      // Don't redirect on localhost as there is no subdomain to redirect to.
      return;
    }
    const currentFullDomain = window.location.hostname;

    // Get the preferred portal.
    const preferredPortalUrl = await this.getPreferredPortal();

    // Is the preferred portal set and different from the current portal?
    if (preferredPortalUrl === null) {
      // Preferred portal is not set.
      return;
    } else if (this.skappIsOnPortal && shouldRedirectToPreferredPortalUrl(currentFullDomain, preferredPortalUrl)) {
      // Redirect to the appropriate URL on a different portal. If we're not on
      // a portal, don't redirect.
      //
      // Get the redirect URL based on the current URL. (Don't use current
      // client as the developer may have set it to e.g. siasky.dev when we are
      // really on siasky.net.)
      await this.redirectToPreferredPortalUrl(preferredPortalUrl);
    } else {
      // If we are on the preferred portal already, or not on a portal at all,
      // we still need to set the client as the developer may have chosen a
      // specific client. We always want to use the user's preference for a
      // portal, if it is set.

      // Set the skapp client to use the user's preferred portal.
      this.connector.client = new SkynetClient(preferredPortalUrl, this.connector.client.customOptions);
    }
  }

  /**
   * Redirects to the given portal URL.
   *
   * @param preferredPortalUrl - The user's preferred portal URL.
   */
  protected async redirectToPreferredPortalUrl(preferredPortalUrl: string): Promise<void> {
    // Get the current skapp on the preferred portal.
    const newUrl = await getRedirectUrlOnPreferredPortal(this.hostDomain, preferredPortalUrl);

    // Check if the portal is valid and working before redirecting.
    const newUrlClient = new SkynetClient(newUrl, this.connector.client.customOptions);
    const portalUrl = await newUrlClient.portalUrl();
    if (portalUrl) {
      // Redirect.
      redirectPage(newUrl);
    }
  }

  /**
   * Asks MySky to sign the non-encrypted registry entry.
   *
   * @param entry - The non-encrypted registry entry.
   * @param path - The MySky path.
   * @returns - The signature.
   */
  protected async signRegistryEntry(entry: RegistryEntry, path: string): Promise<Signature> {
    return await this.connector.connection.remoteHandle().call("signRegistryEntry", entry, path);
  }

  /**
   * Asks MySky to sign the encrypted registry entry.
   *
   * @param entry - The encrypted registry entry.
   * @param path - The MySky path.
   * @returns - The signature.
   */
  protected async signEncryptedRegistryEntry(entry: RegistryEntry, path: string): Promise<Signature> {
    return await this.connector.connection.remoteHandle().call("signEncryptedRegistryEntry", entry, path);
  }
}

/**
 * Redirects the page to the given URL.
 *
 * @param url - The URL.
 */
function redirectPage(url: string): void {
  window.location.replace(url);
}
