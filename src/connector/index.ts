export type { CustomConnectorOptions } from "./base";
export { Dac } from "./dac";
export { MySkyConnector, mySkyDomain } from "./mysky";

import { PermHidden, Permission, PermWrite } from "skynet-interface-utils";

import { SkynetClient } from "../client";
import { Connector, CustomConnectorOptions } from "./base";
import { MySkyConnector, mySkyDomain } from "./mysky";

export async function loadMySky(
  this: SkynetClient,
  appPath: string,
  customOptions?: CustomConnectorOptions
): Promise<MySkyConnector> {
  const connector = await Connector.init(this, mySkyDomain, customOptions);

  const mySkyConnector = connector as MySkyConnector;
  mySkyConnector.addPermissions(new Permission(appPath, PermHidden, PermWrite));

  return mySkyConnector;
}
