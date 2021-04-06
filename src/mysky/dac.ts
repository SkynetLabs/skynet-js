import { Permission } from "skynet-mysky-utils";
import { SkynetClient } from "../client";

import { Connector, CustomConnectorOptions } from "./connector";

export abstract class DacLibrary {
  protected connector?: Connector;

  public constructor(protected dacDomain: string) {}

  public async init(client: SkynetClient, customOptions: CustomConnectorOptions) {
    this.connector = await Connector.init(client, this.dacDomain, customOptions);
  }

  abstract getPermissions(): Permission[];
}
