export type { CustomConnectorOptions } from "./connector";
export { DacLibrary } from "./dac";

import { errorWindowClosed, PermCategory, Permission, PermType, PromiseController } from "skynet-interface-utils";

import { Connector, CustomConnectorOptions } from "./connector";
import { SkynetClient } from "../client";
import { DacLibrary } from "./dac";
import { RegistryEntry } from "../registry";
import { CustomGetJSONOptions, CustomSetJSONOptions, getOrCreateRegistryEntry, JsonData } from "../skydb";
import { hexToUint8Array } from "../utils/string";
import { Signature } from "../crypto";
import { deriveDiscoverableTweak } from "./tweak";
import { Connection, ParentHandshake, WindowMessenger } from "post-me";

export async function loadMySky(
  this: SkynetClient,
  skappDomain: string,
  customOptions?: CustomConnectorOptions
): Promise<MySky> {
  const mySky = await MySky.New(this, skappDomain, customOptions);

  return mySky;
}

export const mySkyDomain = "skynet-mysky.hns";
const mySkyUiRelativeUrl = "ui.html";

export class MySky {
  public static instance: MySky | null = null;

  protected uiError: string = "";

  // ============
  // Constructors
  // ============

  constructor(
    protected connector: Connector,
    // TODO: Decide on how to expose in API
    protected pendingPermissions: Permission[],
    protected domain: string
  ) {}

  static async New(client: SkynetClient, skappDomain: string, customOptions?: CustomConnectorOptions): Promise<MySky> {
    // Enforce singleton.
    if (MySky.instance) {
      throw new Error("MySky was already loaded.");
    }

    const connector = await Connector.init(client, mySkyDomain, customOptions);

    const domain = await client.extractDomain(window.location.hostname);
    // TODO: Are these permissions correct?
    const perm = new Permission(domain, skappDomain, PermCategory.Hidden, PermType.Write);
    const permissions = [perm];

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
    const failedPermissions: Permission[] = await this.connector.connection
      .remoteHandle()
      .call("checkLogin", this.pendingPermissions);

    // Save failed permissions.
    this.pendingPermissions = failedPermissions;

    return (failedPermissions.length === 0);
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

    const { promise: promiseError, controller: controllerError } = this.monitorUiError();

    let uiWindow: Window;
    let uiConnection: Connection;
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

        [uiWindow, uiConnection] = await this.launchUi();

        // Send the UI the list of required permissions.

        // TODO: This should be a dual-promise that also calls ping() on an interval and rejects if no response was found in a given amount of time.
        const failedPermissions: Permission[] = await uiConnection
          .remoteHandle()
          .call("requestLoginAccess", this.pendingPermissions);

        // Save failed permissions.

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

    return (this.pendingPermissions.length === 0);
  }

  async userID(): Promise<string> {
    return this.connector.connection.remoteHandle().call("userID");
  }

  async getJSON(path: string, opts?: CustomGetJSONOptions): Promise<JsonData | null> {
    // TODO: Check for valid inputs.

    const publicKey = await this.userID();
    const dataKey = deriveDiscoverableTweak(path);

    return this.connector.client.db.getJSON(publicKey, Buffer.from(dataKey).toString(), opts);
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

  protected async catchUiError(errorMsg: string) {
    this.uiError = errorMsg;
  }

  protected async launchUi(): Promise<[Window, Connection]> {
    const options = this.connector.options;
    const mySkyUrl = this.connector.url;
    const uiUrl = `${mySkyUrl}/${mySkyUiRelativeUrl}`;

    // Open the window.

    const childWindow = window.open(uiUrl);
    if (!childWindow) {
      throw new Error(`Could not open window at '${uiUrl}'`);
    }

    // Complete handshake with UI window.

    const messenger = new WindowMessenger({
      localWindow: window,
      remoteWindow: childWindow,
      remoteOrigin: "*",
    });
    const methods = {
      catchUiError: this.catchUiError,
    };
    const connection = await ParentHandshake(
      messenger,
      methods,
      options.handshakeMaxAttempts,
      options.handshakeAttemptsInterval
    );

    return [childWindow, connection];
  }

  protected async loadDac(dac: DacLibrary): Promise<void> {
    // Initialize DAC.
    await dac.init(this.connector.client, this.connector.options);

    // Add DAC permissions.
    const perms = dac.getPermissions();
    this.addPermissions(...perms);
  }

  // TODO: Move to promise.ts file in skynet-mysky-utils?
  /**
   * Checks if there has been an error from the UI on an interval.
   */
  protected monitorUiError(): { promise: Promise<void>; controller: PromiseController } {
    const pingInterval = 100;
    const controller = new PromiseController();

    const promise: Promise<void> = new Promise((resolve, reject) => {
      const pingFunc = () => {
        if (this.uiError !== "") {
          reject(this.uiError);
        }
      };

      const intervalId = window.setInterval(pingFunc, pingInterval);

      // Initialize cleanup function.
      controller.cleanup = () => {
        // Clear the interval.
        window.clearInterval(intervalId);
        // Cleanup the promise.
        resolve();
      };
    });

    return { promise, controller };
  }

  protected async signRegistryEntry(entry: RegistryEntry, path: string): Promise<Signature> {
    return this.connector.connection.remoteHandle().call("signRegistryEntry", entry, path);
  }
}
