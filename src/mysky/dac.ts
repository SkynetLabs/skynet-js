import { Permission } from "skynet-interface-utils";
import { SkynetClient } from "../client";

import { Connector, CustomConnectorOptions } from "./connector";

export abstract class DacLibrary {
  protected connector?: Connector;

  public constructor(protected dacPath: string) { }

  public async init(client: SkynetClient, customOptions: CustomConnectorOptions) {
    this.connector = await Connector.init(client, this.dacPath, customOptions);
  }

  abstract getPermissions(): Promise<Permission[]>;
}
