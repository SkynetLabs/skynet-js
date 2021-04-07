export type { CustomConnectorOptions } from "./connector";
export { DacLibrary } from "./dac";

import { Connection, ParentHandshake, WindowMessenger } from "post-me";
import { CheckPermissionsResponse, ErrorHolder, errorWindowClosed, monitorWindowError, PermCategory, Permission, PermType } from "skynet-mysky-utils";

import { Connector, CustomConnectorOptions } from "./connector";
import { SkynetClient } from "../client";
import { DacLibrary } from "./dac";
import { RegistryEntry } from "../registry";
import { CustomGetJSONOptions, CustomSetJSONOptions, getOrCreateRegistryEntry, JsonData } from "../skydb";
import { hexToUint8Array } from "../utils/string";
import { Signature } from "../crypto";
import { deriveDiscoverableTweak } from "./tweak";
import { popupCenter } from "./utils";

export async function loadMySky(
  this: SkynetClient,
  skappDomain?: string,
  customOptions?: CustomConnectorOptions
): Promise<MySky> {
  const mySky = await MySky.New(this, skappDomain, customOptions);

  return mySky;
}

export const mySkyDomain = "skynet-mysky.hns";
const mySkyUiRelativeUrl = "ui.html";
const mySkyUiTitle = "MySky UI";
const [mySkyUiW, mySkyUiH] = [500, 500];

export class MySky {
  static instance: MySky | null = null;

  grantedPermissions: Permission[] = [];
  pendingPermissions: Permission[];

  protected errorHolder = new ErrorHolder();

  // ============
  // Constructors
  // ============

  constructor(
    protected connector: Connector,
    permissions: Permission[],
    protected domain: string
  ) {
    this.pendingPermissions = permissions;
  }

  static async New(client: SkynetClient, skappDomain?: string, customOptions?: CustomConnectorOptions): Promise<MySky> {
    // Enforce singleton.
    if (MySky.instance) {
      return MySky.instance
    }

    const connector = await Connector.init(client, mySkyDomain, customOptions);

    const domain = await client.extractDomain(window.location.hostname);
    const permissions = [];
    if (skappDomain) {
      // TODO: Are these permissions correct?
      const perm1 = new Permission(domain, skappDomain, PermCategory.Hidden, PermType.Read);
      const perm2 = new Permission(domain, skappDomain, PermCategory.Hidden, PermType.Write);
      permissions.push(perm1, perm2);
    }

    MySky.instance = new MySky(connector, permissions, domain);
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

    await Promise.all(promises);
  }

  async addPermissions(...permissions: Permission[]) {
    this.pendingPermissions.push(...permissions);
  }

  async checkLogin(): Promise<boolean> {
    const [seedFound, permissionsResponse]: [boolean, CheckPermissionsResponse] = await this.connector.connection
      .remoteHandle()
      .call("checkLogin", this.pendingPermissions);

    // Save granted and failed permissions.
    const {grantedPermissions, failedPermissions} = permissionsResponse;
    this.grantedPermissions = grantedPermissions;
    this.pendingPermissions = failedPermissions;

    return (seedFound && failedPermissions.length === 0);
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
    // TODO
  }

  async requestLoginAccess(): Promise<boolean> {
    // Add error listener.

    const { promise: promiseError, controller: controllerError } = monitorWindowError(this.errorHolder);

    let uiWindow: Window;
    let uiConnection: Connection;
    let seedFound = false;

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
        const [seedFoundResponse, permissionsResponse]: [boolean, CheckPermissionsResponse] = await uiConnection
          .remoteHandle()
          .call("requestLoginAccess", this.pendingPermissions);
        seedFound = seedFoundResponse;

        // Save failed permissions.

        const {grantedPermissions, failedPermissions} = permissionsResponse;
        this.grantedPermissions = grantedPermissions;
        this.pendingPermissions = failedPermissions;
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

    return (seedFound && this.pendingPermissions.length === 0);
  }

  async userID(): Promise<string> {
    return this.connector.connection.remoteHandle().call("userID");
  }

  async getJSON(path: string, opts?: CustomGetJSONOptions): Promise<JsonData | null> {
    // TODO: Check for valid inputs.

    const publicKey = await this.userID();
    const dataKey = deriveDiscoverableTweak(path);

    const versionedEntry = await this.connector.client.db.getJSON(publicKey, Buffer.from(dataKey).toString(), opts);
    return versionedEntry.data;
  }

  async setJSON(path: string, json: JsonData, revision?: bigint, opts?: CustomSetJSONOptions): Promise<void> {
    // TODO: Check for valid inputs.

    const publicKey = await this.userID();
    const dataKey = deriveDiscoverableTweak(path);

    const entry = await getOrCreateRegistryEntry(
      this.connector.client,
      hexToUint8Array(publicKey),
      Buffer.from(dataKey).toString(),
      json,
      revision,
      opts
    );

    const signature = await this.signRegistryEntry(entry, path);

    return await this.connector.client.registry.postSignedEntry(hexToUint8Array(publicKey), entry, signature, opts);
  }

  // ================
  // Internal Methods
  // ================

  protected async catchError(errorMsg: string) {
    this.errorHolder.error = errorMsg;
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

  protected async signRegistryEntry(entry: RegistryEntry, path: string): Promise<Signature> {
    return this.connector.connection.remoteHandle().call("signRegistryEntry", entry, path);
  }
}
