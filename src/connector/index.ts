export type { CustomConnectorOptions } from "./base";
export { Dac } from "./dac";
export { MySky, mySkyDomain } from "./mysky";

import { PermHidden, Permission, PermWrite } from "skynet-interface-utils";

import { SkynetClient } from "../client";
import { CustomConnectorOptions } from "./base";
import { MySky } from "./mysky";

export async function loadMySky(
  this: SkynetClient,
  appPath: string,
  customOptions?: CustomConnectorOptions
): Promise<MySky> {
  const mySky = await MySky.init(this, customOptions);;
  mySky.addPermissions(new Permission(appPath, PermHidden, PermWrite));

  return mySky;
}
