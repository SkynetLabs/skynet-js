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
import {
  CustomGetEntryOptions,
  DEFAULT_GET_ENTRY_OPTIONS,
  DEFAULT_SET_ENTRY_OPTIONS,
  getEntryLink,
  RegistryEntry,
} from "../registry";
import {
  DEFAULT_GET_JSON_OPTIONS,
  DEFAULT_SET_JSON_OPTIONS,
  CustomGetJSONOptions,
  CustomSetJSONOptions,
  getOrCreateSkyDBRegistryEntry,
  JSONResponse,
  validateEntryData,
  CustomSetEntryDataOptions,
  DEFAULT_SET_ENTRY_DATA_OPTIONS,
  DELETION_ENTRY_DATA,
  incrementRevision,
} from "../skydb";
import { Signature } from "../crypto";
import { deriveDiscoverableFileTweak } from "./tweak";
import { getRedirectUrlOnPreferredPortal, popupCenter, shouldRedirectToPreferredPortalUrl } from "./utils";
import { extractOptions } from "../utils/options";
import { JsonData } from "../utils/types";
import {
  validateBoolean,
  validateObject,
  validateOptionalObject,
  validateSkylinkString,
  validateString,
  validateUint8Array,
} from "../utils/validation";
import { decodeSkylink } from "../skylink/sia";
import {
  decryptJSONFile,
  deriveEncryptedFileKeyEntropy,
  deriveEncryptedFileTweak,
  EncryptedJSONResponse,
  ENCRYPTED_JSON_RESPONSE_VERSION,
  encryptJSONFile,
} from "./encrypted_files";

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
   * @param currentPortalUrl - The URL of the current portal. This is the portal that the skapp is running on, not the portal that may have been requested by the developer when creating a `SkynetClient`.
   */
  constructor(
    protected connector: Connector,
    permissions: Permission[],
    protected hostDomain: string,
    protected currentPortalUrl: string
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
    if (opts.alpha) {
      domain = MYSKY_ALPHA_DOMAIN;
    } else if (opts.dev) {
      domain = MYSKY_DEV_DOMAIN;
    }
    const connector = await Connector.init(client, domain, customOptions);

    let currentPortalUrl;
    let hostDomain;
    if (window.location.hostname === "localhost") {
      currentPortalUrl = window.location.href;
      hostDomain = "localhost";
    } else {
      // MySky expects to be on the same portal as the skapp, so create a new
      // client on the current skapp URL, in case the client the developer
      // instantiated does not correspond to the portal of the current URL.
      const currentUrlClient = new SkynetClient(window.location.hostname);
      // Trigger a resolve of the portal URL manually. `new SkynetClient` assumes
      // a portal URL is given to it, so it doesn't make the request for the
      // actual portal URL.
      //
      // TODO: We should rework this so it is possible without protected methods.
      //
      // @ts-expect-error - Using protected fields.
      currentUrlClient.customPortalUrl = await currentUrlClient.resolvePortalUrl();
      currentPortalUrl = await currentUrlClient.portalUrl();

      // Get the host domain.
      hostDomain = await currentUrlClient.extractDomain(window.location.hostname);
    }

    // Extract the skapp domain.
    const permissions = [];
    if (skappDomain) {
      const perm1 = new Permission(hostDomain, skappDomain, PermCategory.Discoverable, PermType.Write);
      const perm2 = new Permission(hostDomain, skappDomain, PermCategory.Hidden, PermType.Read);
      const perm3 = new Permission(hostDomain, skappDomain, PermCategory.Hidden, PermType.Write);
      permissions.push(perm1, perm2, perm3);
    }

    MySky.instance = new MySky(connector, permissions, hostDomain, currentPortalUrl);

    // Redirect if we're not on the preferred portal. See
    // `redirectIfNotOnPreferredPortal` for full load flow.
    await MySky.instance.redirectIfNotOnPreferredPortal();

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
    await this.handleLogin(loggedIn);
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
    return await this.connector.connection.remoteHandle().call("logout");
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
    await this.handleLogin(loggedIn);
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

  /**
   * Gets Discoverable JSON at the given path through MySky, if the user has
   * given Discoverable Read permissions to do so.
   *
   * @param path - The data path.
   * @param [customOptions] - Additional settings that can optionally be set.
   * @returns - An object containing the json data as well as the skylink for the data.
   * @throws - Will throw if the user does not have Discoverable Read permission on the path.
   */
  async getJSON(path: string, customOptions?: CustomGetJSONOptions): Promise<JSONResponse> {
    validateString("path", path, "parameter");
    validateOptionalObject("customOptions", customOptions, "parameter", DEFAULT_GET_JSON_OPTIONS);

    const opts = {
      ...DEFAULT_GET_JSON_OPTIONS,
      ...this.connector.client.customOptions,
      ...customOptions,
    };

    const publicKey = await this.userID();
    const dataKey = deriveDiscoverableFileTweak(path);
    opts.hashedDataKeyHex = true; // Do not hash the tweak anymore.

    return await this.connector.client.db.getJSON(publicKey, dataKey, opts);
  }

  /**
   * Gets the entry link for the entry at the given path. This is a v2 skylink.
   * This link stays the same even if the content at the entry changes.
   *
   * @param path - The data path.
   * @returns - The entry link.
   */
  async getEntryLink(path: string): Promise<string> {
    validateString("path", path, "parameter");

    const publicKey = await this.userID();
    const dataKey = deriveDiscoverableFileTweak(path);
    // Do not hash the tweak anymore.
    const opts = { ...DEFAULT_GET_ENTRY_OPTIONS, hashedDataKeyHex: true };

    return getEntryLink(publicKey, dataKey, opts);
  }

  /**
   * Sets Discoverable JSON at the given path through MySky, if the user has
   * given Discoverable Write permissions to do so.
   *
   * @param path - The data path.
   * @param json - The json to set.
   * @param [customOptions] - Additional settings that can optionally be set.
   * @returns - An object containing the json data as well as the skylink for the data.
   * @throws - Will throw if the user does not have Discoverable Write permission on the path.
   */
  async setJSON(path: string, json: JsonData, customOptions?: CustomSetJSONOptions): Promise<JSONResponse> {
    validateString("path", path, "parameter");
    validateObject("json", json, "parameter");
    validateOptionalObject("customOptions", customOptions, "parameter", DEFAULT_SET_JSON_OPTIONS);

    const opts = {
      ...DEFAULT_SET_JSON_OPTIONS,
      ...this.connector.client.customOptions,
      ...customOptions,
    };

    const publicKey = await this.userID();
    const dataKey = deriveDiscoverableFileTweak(path);
    opts.hashedDataKeyHex = true; // Do not hash the tweak anymore.

    // Immediately fail if the mutex is not available.
    return await this.connector.client.db.revisionNumberCache.withCachedEntryLock(
      publicKey,
      dataKey,
      async (cachedRevisionEntry) => {
        // Get the cached revision number before doing anything else.
        const newRevision = incrementRevision(cachedRevisionEntry.revision);

        // Call SkyDB helper to create the registry entry. We can't call SkyDB's
        // setJSON here directly because we need MySky to sign the entry, instead of
        // signing it ourselves with a given private key.
        const [entry, dataLink] = await getOrCreateSkyDBRegistryEntry(
          this.connector.client,
          dataKey,
          json,
          newRevision,
          opts
        );

        const signature = await this.signRegistryEntry(entry, path);

        const setEntryOpts = extractOptions(opts, DEFAULT_SET_ENTRY_OPTIONS);
        await this.connector.client.registry.postSignedEntry(publicKey, entry, signature, setEntryOpts);

        return { data: json, dataLink };
      }
    );
  }

  /**
   * Deletes Discoverable JSON at the given path through MySky, if the user has
   * given Discoverable Write permissions to do so.
   *
   * @param path - The data path.
   * @param [customOptions] - Additional settings that can optionally be set.
   * @returns - An empty promise.
   * @throws - Will throw if the revision is already the maximum value.
   * @throws - Will throw if the user does not have Discoverable Write permission on the path.
   */
  async deleteJSON(path: string, customOptions?: CustomSetEntryDataOptions): Promise<void> {
    // Validation is done below in `setEntryData`.

    const opts = {
      ...DEFAULT_SET_ENTRY_DATA_OPTIONS,
      ...this.connector.client.customOptions,
      ...customOptions,
    };

    // We re-implement deleteJSON instead of calling SkyDB's deleteJSON so that
    // MySky can do the signing.
    await this.setEntryData(path, DELETION_ENTRY_DATA, { ...opts, allowDeletionEntryData: true });
  }

  // ==================
  // Entry Data Methods
  // ==================

  /**
   * Sets entry at the given path to point to the data link. Like setJSON, but it doesn't upload a file.
   *
   * @param path - The data path.
   * @param dataLink - The data link to set at the path.
   * @param [customOptions] - Additional settings that can optionally be set.
   * @returns - An empty promise.
   * @throws - Will throw if the user does not have Discoverable Write permission on the path.
   */
  async setDataLink(path: string, dataLink: string, customOptions?: CustomSetEntryDataOptions): Promise<void> {
    const parsedSkylink = validateSkylinkString("dataLink", dataLink, "parameter");
    // Rest of validation is done below in `setEntryData`.

    const data = decodeSkylink(parsedSkylink);

    await this.setEntryData(path, data, customOptions);
  }

  /**
   * Gets the raw registry entry data for the given path, if the user has given
   * Discoverable Read permissions.
   *
   * @param path - The data path.
   * @param [customOptions] - Additional settings that can optionally be set.
   * @returns - The entry data.
   * @throws - Will throw if the user does not have Discoverable Read permission on the path.
   */
  async getEntryData(path: string, customOptions?: CustomGetEntryOptions): Promise<EntryData> {
    validateString("path", path, "parameter");
    validateOptionalObject("customOptions", customOptions, "parameter", DEFAULT_GET_ENTRY_OPTIONS);

    const opts = {
      ...DEFAULT_GET_ENTRY_OPTIONS,
      ...this.connector.client.customOptions,
      ...customOptions,
    };

    const publicKey = await this.userID();
    const dataKey = deriveDiscoverableFileTweak(path);
    opts.hashedDataKeyHex = true; // Do not hash the tweak anymore.

    return await this.connector.client.db.getEntryData(publicKey, dataKey, opts);
  }

  /**
   * Sets the raw registry entry data at the given path, if the user has given Discoverable
   * Write permissions.
   *
   * @param path - The data path.
   * @param data - The raw entry data to set.
   * @param [customOptions] - Additional settings that can optionally be set.
   * @returns - The entry data.
   * @throws - Will throw if the length of the data is > 70 bytes.
   * @throws - Will throw if the user does not have Discoverable Write permission on the path.
   */
  async setEntryData(path: string, data: Uint8Array, customOptions?: CustomSetEntryDataOptions): Promise<EntryData> {
    validateString("path", path, "parameter");
    validateUint8Array("data", data, "parameter");
    validateOptionalObject("customOptions", customOptions, "parameter", DEFAULT_SET_ENTRY_DATA_OPTIONS);

    const opts = {
      ...DEFAULT_SET_ENTRY_DATA_OPTIONS,
      ...this.connector.client.customOptions,
      ...customOptions,
    };

    // We re-implement setEntryData instead of calling SkyDB's setEntryData so
    // that MySky can do the signing.

    validateEntryData(data, opts.allowDeletionEntryData);

    const publicKey = await this.userID();
    const dataKey = deriveDiscoverableFileTweak(path);
    opts.hashedDataKeyHex = true; // Do not hash the tweak anymore.

    // Immediately fail if the mutex is not available.
    return await this.connector.client.db.revisionNumberCache.withCachedEntryLock(
      publicKey,
      dataKey,
      async (cachedRevisionEntry) => {
        // Get the cached revision number before doing anything else.
        const newRevision = incrementRevision(cachedRevisionEntry.revision);

        const entry = { dataKey, data, revision: newRevision };

        const signature = await this.signRegistryEntry(entry, path);

        const setEntryOpts = extractOptions(opts, DEFAULT_SET_ENTRY_OPTIONS);
        await this.connector.client.registry.postSignedEntry(publicKey, entry, signature, setEntryOpts);

        return { data: entry.data };
      }
    );
  }

  /**
   * Deletes the entry data at the given path, if the user has given Discoverable
   * Write permissions.
   *
   * @param path - The data path.
   * @param [customOptions] - Additional settings that can optionally be set.
   * @returns - An empty promise.
   * @throws - Will throw if the user does not have Discoverable Write permission on the path.
   */
  async deleteEntryData(path: string, customOptions?: CustomSetEntryDataOptions): Promise<void> {
    // Validation is done in `setEntryData`.

    await this.setEntryData(path, DELETION_ENTRY_DATA, { ...customOptions, allowDeletionEntryData: true });
  }

  // ===============
  // Encrypted Files
  // ===============

  /**
   * Lets you get the share-able path seed, which can be passed to
   * file.getJSONEncrypted. Requires Hidden Read permission on the path.
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
   * file.getJSONEncrypted. Requires Hidden Read permission on the path.
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
   * Gets Encrypted JSON at the given path through MySky, if the user has given
   * Hidden Read permissions to do so.
   *
   * @param path - The data path.
   * @param [customOptions] - Additional settings that can optionally be set.
   * @returns - An object containing the decrypted json data.
   * @throws - Will throw if the user does not have Hidden Read permission on the path.
   */
  async getJSONEncrypted(path: string, customOptions?: CustomGetJSONOptions): Promise<EncryptedJSONResponse> {
    validateString("path", path, "parameter");
    validateOptionalObject("customOptions", customOptions, "parameter", DEFAULT_GET_JSON_OPTIONS);

    const opts = {
      ...DEFAULT_GET_JSON_OPTIONS,
      ...this.connector.client.customOptions,
      ...customOptions,
      hashedDataKeyHex: true, // Do not hash the tweak anymore.
    };

    // Call MySky which checks for read permissions on the path.
    const [publicKey, pathSeed] = await Promise.all([this.userID(), this.getEncryptedPathSeed(path, false)]);

    // Fetch the raw encrypted JSON data.
    const dataKey = deriveEncryptedFileTweak(pathSeed);
    const { data } = await this.connector.client.db.getRawBytes(publicKey, dataKey, opts);
    if (data === null) {
      return { data: null };
    }

    const encryptionKey = deriveEncryptedFileKeyEntropy(pathSeed);
    const json = decryptJSONFile(data, encryptionKey);

    return { data: json };
  }

  /**
   * Sets Encrypted JSON at the given path through MySky, if the user has given
   * Hidden Write permissions to do so.
   *
   * @param path - The data path.
   * @param json - The json to encrypt and set.
   * @param [customOptions] - Additional settings that can optionally be set.
   * @returns - An object containing the original json data.
   * @throws - Will throw if the user does not have Hidden Write permission on the path.
   */
  async setJSONEncrypted(
    path: string,
    json: JsonData,
    customOptions?: CustomSetJSONOptions
  ): Promise<EncryptedJSONResponse> {
    validateString("path", path, "parameter");
    validateObject("json", json, "parameter");
    validateOptionalObject("customOptions", customOptions, "parameter", DEFAULT_SET_JSON_OPTIONS);

    const opts = {
      ...DEFAULT_SET_JSON_OPTIONS,
      ...this.connector.client.customOptions,
      ...customOptions,
    };

    // Call MySky which checks for read permissions on the path.
    const [publicKey, pathSeed] = await Promise.all([this.userID(), this.getEncryptedPathSeed(path, false)]);
    const dataKey = deriveEncryptedFileTweak(pathSeed);
    opts.hashedDataKeyHex = true; // Do not hash the tweak anymore.

    // Immediately fail if the mutex is not available.
    return await this.connector.client.db.revisionNumberCache.withCachedEntryLock(
      publicKey,
      dataKey,
      async (cachedRevisionEntry) => {
        // Get the cached revision number before doing anything else.
        const newRevision = incrementRevision(cachedRevisionEntry.revision);

        // Derive the key.
        const encryptionKey = deriveEncryptedFileKeyEntropy(pathSeed);

        // Pad and encrypt json file.
        const data = encryptJSONFile(json, { version: ENCRYPTED_JSON_RESPONSE_VERSION }, encryptionKey);

        const [entry] = await getOrCreateSkyDBRegistryEntry(this.connector.client, dataKey, data, newRevision, opts);

        // Call MySky which checks for write permissions on the path.
        const signature = await this.signEncryptedRegistryEntry(entry, path);

        const setEntryOpts = extractOptions(opts, DEFAULT_SET_ENTRY_OPTIONS);
        await this.connector.client.registry.postSignedEntry(publicKey, entry, signature, setEntryOpts);

        return { data: json };
      }
    );
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
   *
   * @param loggedIn - Whether the login was successful.
   */
  protected async handleLogin(loggedIn: boolean): Promise<void> {
    if (!loggedIn) {
      return;
    }

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
    await this.redirectIfNotOnPreferredPortal();
  }

  /**
   * Get the preferred portal and redirect the page if it is different than
   * the current portal.
   *
   *  Load MySky redirect flow:
   *
   *  1. SDK opens MySky on the same portal as the skapp.
   *  2. If the preferred portal is found in localstorage, MySky connects to it
   *     and we go to step 5.
   *  3. Else, MySky connects to siasky.net.
   *  4. MySky tries to get the saved portal preference.
   *     1. If the portal is set, MySky switches to using the preferred portal.
   *     2. If it is not set or we don't have the seed, MySky switches to using
   *        the current portal as opposed to siasky.net.
   *  5. After MySky finishes loading, SDK queries `mySky.getPortalPreference`.
   *  6. If the preferred portal is set and different than the current portal,
   *     SDK triggers refresh.
   *  7. We go back to step 1 and repeat, but since we're on the right portal
   *     now we won't refresh in step 6.
   *
   * Login redirect flow:
   *
   * 1. SDK logs in through the UI.
   * 2. MySky UI switches to siasky.net and tries to get the saved portal
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
    const currentUrl = window.location.hostname;
    const preferredPortalUrl = await this.getPreferredPortal();
    if (preferredPortalUrl !== null && shouldRedirectToPreferredPortalUrl(currentUrl, preferredPortalUrl)) {
      // Redirect.
      const newUrl = getRedirectUrlOnPreferredPortal(
        this.currentPortalUrl,
        window.location.hostname,
        preferredPortalUrl
      );
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
