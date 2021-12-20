/* istanbul ignore file: Much of this functionality is only testable from a browser */

import { Permission } from "skynet-mysky-utils";

import { SkynetClient } from "../client";
import { Connector, CustomConnectorOptions } from "./connector";

/**
 * The base DAC class with base and required methods.
 */
export abstract class DacLibrary {
  protected connector?: Connector;

  /**
   * Constructs the DAC.
   *
   * @param dacDomain - The domain of the DAC.
   */
  public constructor(protected dacDomain: string) {}

  /**
   * Initializes the `Connector` with the DAC iframe and calls `init` on the
   * DAC.
   *
   * @param client - The Skynet Client.
   * @param customOptions - The custom options.
   */
  public async init(client: SkynetClient, customOptions: CustomConnectorOptions): Promise<void> {
    this.connector = await Connector.init(client, this.dacDomain, customOptions);
    await this.connector.connection.remoteHandle().call("init");
  }

  /**
   * Returns the permissions required by the DAC.
   *
   * @returns - The DAC permissions.
   */
  abstract getPermissions(): Permission[];

  /**
   * The hook to run on user login.
   */
  async onUserLogin(): Promise<void> {
    if (!this.connector) {
      throw new Error("init was not called");
    }

    await this.connector.connection.remoteHandle().call("onUserLogin");
  }
}
