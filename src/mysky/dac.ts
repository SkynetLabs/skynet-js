/* istanbul ignore file: Much of this functionality is only testable from a browser */

import { Permission } from "skynet-mysky-utils";

import { SkynetClient } from "../client";
import { Connector, CustomConnectorOptions } from "./connector";

export abstract class DacLibrary {
  protected connector?: Connector;

  public constructor(protected dacDomain: string) {}

  public async init(client: SkynetClient, customOptions: CustomConnectorOptions): Promise<void> {
    this.connector = await Connector.init(client, this.dacDomain, customOptions);
    await this.connector.connection.remoteHandle().call("init");
  }

  abstract getPermissions(): Permission[];

  async onUserLogin(): Promise<void> {
    if (!this.connector) {
      throw new Error("init was not called");
    }

    await this.connector.connection.remoteHandle().call("onUserLogin");
  }
}
