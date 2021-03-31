import { Permission } from "skynet-interface-utils";

import { Connector, CustomConnectorOptions } from "./base";
import { SkynetClient } from "../client";

export class Dac {
  [index: string]: Function;

  static async init(client: SkynetClient, domain: string, customOptions?: CustomConnectorOptions): Promise<Dac> {
    const connector = await Connector.init(client, domain, customOptions);
  }
}
