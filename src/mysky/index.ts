export type { CustomConnectorOptions } from "./connector";
export { DacLibrary } from "./dac";

import { PermHidden, Permission, PermWrite } from "skynet-interface-utils";

import { Connector, CustomConnectorOptions } from "./connector";
import { SkynetClient } from "../client";
import { DacLibrary } from "./dac";

export async function loadMySky(
  this: SkynetClient,
  appPath: string,
  customOptions?: CustomConnectorOptions
): Promise<MySky> {
  const mySky = await MySky.init(this, customOptions);
  mySky.addPermissions(new Permission(appPath, PermHidden, PermWrite));

  return mySky;
}

export const mySkyDomain = "skynet-mysky.hns";

export class MySky {
  protected permissions: Permission[] = [];

  // ============
  // Constructors
  // ============

  constructor(protected connector: Connector) {}

  static async init(client: SkynetClient, customOptions?: CustomConnectorOptions): Promise<MySky>{
    const connector = await Connector.init(client, mySkyDomain, customOptions);

    return new MySky(connector);
  }

  // ==========
  // Public API
  // ==========

  /**
   * Loads the given DACs. Takes one or more instantiated DAC libraries.
   */
  async loadDacs(dac: DacLibrary, ...dacs: DacLibrary[]): Promise<void> {
    if (dacs) {
      dacs.unshift(dac);
    } else {
      dacs = [dac];
    }

    const promises: Promise<void>[] = [];
    for (const dac of dacs) {
      promises.push(this.loadDac(dac));
    }

    await Promise.all(promises);
  }

  async addPermissions(...permissions: Permission[]) {
    this.permissions.push(...permissions);
  }

  async checkLogin(): Promise<boolean> {
    // TODO
    return true;
  }

  /**
   * Destroys the mysky connection by:
   *
   * 1. Destroying the connected DACs,
   *
   * 2. Closing the bridge connection,
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
    // TODO
    return true;
  }

  // ================
  // Internal Methods
  // ================

  async loadDac(dac: DacLibrary): Promise<void> {
    // Initialize DAC.
    await dac.init(this.connector.client, this.connector.options);

    // Add DAC permissions.
    const perms = await dac.getPermissions();
    this.addPermissions(...perms);
  }
}
