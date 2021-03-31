import { Permission } from "skynet-interface-utils";

import { Connector, CustomConnectorOptions } from "./base";
import { SkynetClient } from "../client";
import { Dac } from "./dac";

export const mySkyDomain = "skynet-mysky.hns";

export class MySky {
  protected permissions: Permission[] = [];

  constructor(protected connector: Connector) {}

  static async init(client: SkynetClient, customOptions?: CustomConnectorOptions): Promise<MySky>{
    const connector = await Connector.init(client, mySkyDomain, customOptions);

    return new MySky(connector);
  }

  async loadDacs(path: string): Promise<Dac>;
  async loadDacs(path: string, ...paths: string[]): Promise<Dac[]>;
  async loadDacs(path: string, ...paths: string[]): Promise<Dac | Dac[]> {
    if (paths) {
      paths.unshift(path);
    } else {
      paths = [path];
    }

    const promises: Promise<Dac>[] = [];
    for (let dacPath of paths) {
      promises.push(new Promise(async () => {
        // Initialize DAC.
        const dac = await Dac.init(this.connector.client, dacPath, this.connector.options);

        // Add DAC permissions.
        const perms = await dac.getPermissions();
        this.addPermissions(...perms);

        return dac;
      }));
    }

    const dacs: Dac[] = await Promise.all(promises);

    if (paths) {
      return dacs;
    } else {
      return dacs[0];
    }
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
}
