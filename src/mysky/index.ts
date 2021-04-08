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

import { Connector, CustomConnectorOptions } from "./connector";
import { SkynetClient } from "../client";
import { DacLibrary } from "./dac";
import { RegistryEntry } from "../registry";
import {
  CustomGetJSONOptions,
  CustomSetJSONOptions,
  getOrCreateRegistryEntry,
  JsonData,
  VersionedEntryData,
} from "../skydb";
import { hexToUint8Array, uint8ArrayToString } from "../utils/string";
import { Signature } from "../crypto";
import { deriveDiscoverableTweak } from "./tweak";
import { popupCenter } from "./utils";

export type CustomMySkyOptions = CustomConnectorOptions & {
  dev: boolean;
};

const defaultMySkyOptions = {
  dev: false,
};

export async function loadMySky(
  this: SkynetClient,
  skappDomain?: string,
  customOptions?: CustomMySkyOptions
): Promise<MySky> {
  const mySky = await MySky.New(this, skappDomain, customOptions);

  return mySky;
}

export const mySkyDomain = "skynet-mysky.hns";
export const mySkyDevDomain = "sandbridge.hns";
const mySkyUiRelativeUrl = "ui.html";
const mySkyUiTitle = "MySky UI";
const [mySkyUiW, mySkyUiH] = [500, 500];

export class MySky {
  static instance: MySky | null = null;

  dacs: DacLibrary[] = [];
  grantedPermissions: Permission[] = [];
  pendingPermissions: Permission[];

  // ============
  // Constructors
  // ============

  constructor(protected connector: Connector, permissions: Permission[], protected hostDomain: string) {
    this.pendingPermissions = permissions;
  }

  static async New(client: SkynetClient, skappDomain?: string, customOptions?: CustomMySkyOptions): Promise<MySky> {
    const opts = { ...defaultMySkyOptions, ...customOptions };

    // Enforce singleton.
    if (MySky.instance) {
      return MySky.instance;
    }

    let domain = mySkyDomain;
    if (opts.dev) {
      domain = mySkyDevDomain;
    }
    const connector = await Connector.init(client, domain, customOptions);

    const hostDomain = await client.extractDomain(window.location.hostname);
    const permissions = [];
    if (skappDomain) {
      // TODO: Are these permissions correct?
      const perm1 = new Permission(hostDomain, skappDomain, PermCategory.Hidden, PermType.Read);
      const perm2 = new Permission(hostDomain, skappDomain, PermCategory.Hidden, PermType.Write);
      permissions.push(perm1, perm2);
    }

    MySky.instance = new MySky(connector, permissions, hostDomain);
    return MySky.instance;
  }

  // ==========
  // Public API
  // ==========

  /**
   * Loads the given DACs.
   */
  async loadDacs(...dacs: DacLibrary[]): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const dac of dacs) {
      promises.push(this.loadDac(dac));
    }

    this.dacs.push(...dacs);

    await Promise.all(promises);
  }

  async addPermissions(...permissions: Permission[]) {
    this.pendingPermissions.push(...permissions);
  }

  async checkLogin(): Promise<boolean> {
    const [seedFound, permissionsResponse]: [
      boolean,
      CheckPermissionsResponse
    ] = await this.connector.connection.remoteHandle().call("checkLogin", this.pendingPermissions);

    // Save granted and failed permissions.
    const { grantedPermissions, failedPermissions } = permissionsResponse;
    this.grantedPermissions = grantedPermissions;
    this.pendingPermissions = failedPermissions;

    const loggedIn = seedFound && failedPermissions.length === 0;
    this.handleLogin(loggedIn);
    return loggedIn;
  }

  /**
   * Destroys the mysky connection by:
   *
   * 1. Destroying the connected DACs,
   *
   * 2. Closing the connection,
   *
   * 3. Closing the child iframe
   */
  async destroy(): Promise<void> {
    // TODO: For all connected dacs, send a destroy call.

    // TODO: Delete all connected dacs.

    // Close the connection.
    this.connector.connection.close();

    // Close the child iframe.
    if (this.connector.childFrame) {
      this.connector.childFrame.parentNode!.removeChild(this.connector.childFrame);
    }
  }

  async logout(): Promise<void> {
    return await this.connector.connection.remoteHandle().call("logout");
  }

  async requestLoginAccess(): Promise<boolean> {
    let uiWindow: Window;
    let uiConnection: Connection;
    let seedFound = false;

    // Add error listener.
    const { promise: promiseError, controller: controllerError } = monitorWindowError();

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
        // Launch the UI.

        uiWindow = await this.launchUI();
        uiConnection = await this.connectUi(uiWindow);

        // Send the UI the list of required permissions.

        // TODO: This should be a dual-promise that also calls ping() on an interval and rejects if no response was found in a given amount of time.
        const [seedFoundResponse, permissionsResponse]: [
          boolean,
          CheckPermissionsResponse
        ] = await uiConnection.remoteHandle().call("requestLoginAccess", this.pendingPermissions);
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
    this.handleLogin(loggedIn);
    return loggedIn;
  }

  async userID(): Promise<string> {
    return await this.connector.connection.remoteHandle().call("userID");
  }

  async getJSON(path: string, opts?: CustomGetJSONOptions): Promise<VersionedEntryData> {
    // TODO: Check for valid inputs.

    const publicKey = await this.userID();
    const dataKey = deriveDiscoverableTweak(path);

    return await this.connector.client.db.getJSON(publicKey, uint8ArrayToString(dataKey), opts);
  }

  async setJSON(path: string, json: JsonData, revision?: bigint, opts?: CustomSetJSONOptions): Promise<void> {
    // TODO: Check for valid inputs.

    const publicKey = await this.userID();
    // TODO: Convert to hex?
    const dataKey = deriveDiscoverableTweak(path);

    const entry = await getOrCreateRegistryEntry(
      this.connector.client,
      hexToUint8Array(publicKey),
      uint8ArrayToString(dataKey),
      json,
      revision,
      opts
    );

    const signature = await this.signRegistryEntry(entry, path);

    return await this.connector.client.registry.postSignedEntry(publicKey, entry, signature, opts);
  }

  // ================
  // Internal Methods
  // ================

  protected async catchError(errorMsg: string) {
    const event = new CustomEvent(dispatchedErrorEvent, { detail: errorMsg });
    window.dispatchEvent(event);
  }

  protected async launchUI(): Promise<Window> {
    const mySkyUrl = this.connector.url;
    const uiUrl = `${mySkyUrl}/${mySkyUiRelativeUrl}`;

    // Open the window.

    const childWindow = popupCenter(uiUrl, mySkyUiTitle, mySkyUiW, mySkyUiH);
    if (!childWindow) {
      throw new Error(`Could not open window at '${uiUrl}'`);
    }

    return childWindow;
  }

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

  protected async loadDac(dac: DacLibrary): Promise<void> {
    // Initialize DAC.
    await dac.init(this.connector.client, this.connector.options);

    // Add DAC permissions.
    const perms = dac.getPermissions();
    this.addPermissions(...perms);
  }

  protected handleLogin(loggedIn: boolean): void {
    if (loggedIn) {
      for (let dac of this.dacs) {
        dac.onUserLogin();
      }
    }
  }

  protected async signRegistryEntry(entry: RegistryEntry, path: string): Promise<Signature> {
    return await this.connector.connection.remoteHandle().call("signRegistryEntry", entry, path);
  }
}
