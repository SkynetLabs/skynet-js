import { Permission } from "skynet-interface-utils";

import { Connector } from "./base";
import { Dac } from "./dac";

export const mySkyDomain = "skynet-mysky.hns";

export class MySkyConnector extends Connector {
  protected permissions: Permission[] = [];

  async loadDacs(path: string): Promise<Dac>;
  async loadDacs(path: string, ...paths: string[]): Promise<Dac[]>;
  async loadDacs(path: string, ...paths: string[]): Promise<Dac | Dac[]> {
    if (paths) {
      paths.unshift(path);
    } else {
      paths = [path];
    }

    const dacs = [];
    for (let dacPath of paths) {
      // Initialize DAC.
      const connector = await Connector.init(this.client, dacPath);
      const dac = Dac.init(connector);
      dacs.push(dac);

      // Add DAC permissions.
      await dac.getPermissions();
      // const perms = await dac.getPermissions();
      // this.addPermissions(...perms);
    }

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
    this.connection.close();

    // Close the child iframe.
    if (this.childFrame) {
      this.childFrame.parentNode!.removeChild(this.childFrame);
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
