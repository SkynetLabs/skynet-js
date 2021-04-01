export type { CustomConnectorOptions } from "./connector";
export { DacLibrary } from "./dac";

import { PermCategory, PermHidden, Permission, PermType, PermWrite } from "skynet-interface-utils";

import { Connector, CustomConnectorOptions } from "./connector";
import { SkynetClient } from "../client";
import { DacLibrary } from "./dac";
import { RegistryEntry, setSignedEntry, SignedRegistryEntry } from "../registry";
import { CustomGetJSONOptions, CustomSetJSONOptions, getOrCreateRegistryEntry, JsonData } from "../skydb";
import { hexToUint8Array } from "../utils/string";
import { Signature } from "../crypto";
import { deriveDiscoverableTweak } from "./tweak";

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
  // ============
  // Constructors
  // ============

  constructor(protected connector: Connector, protected permissions: Permission[]) {}

  static async init(client: SkynetClient, customOptions?: CustomConnectorOptions): Promise<MySky> {
    const connector = await Connector.init(client, mySkyDomain, customOptions);

    const domain = await client.extractDomain(window.location.hostname);
    // TODO: Add requestor field to Permission?
    // TODO: Are these permissions correct?
    const perm = new Permission(domain, PermCategory.Hidden, PermType.Write);
    const permissions = [perm];

    return new MySky(connector, permissions);
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
    return this.connector.connection.remoteHandle().call("checkLogin", this.permissions);
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

  async userID(): Promise<string> {
    // TODO
    throw new Error("not implemented");
  }

  async getJSON(path: string, opts?: CustomGetJSONOptions): Promise<JsonData | null> {
    // TODO: Check for valid inputs.

    const publicKey = await this.userID();
    const dataKey = deriveDiscoverableTweak(path);

    return this.connector.client.db.getJSON(publicKey, Buffer.from(dataKey).toString(), opts);
  }

  async setJSON(path: string, json: JsonData, revision?: bigint, opts?: CustomSetJSONOptions): Promise<void> {
    // TODO: Check for valid inputs.

    const publicKey = await this.userID();
    const dataKey = deriveDiscoverableTweak(path);

    const entry = await getOrCreateRegistryEntry(
      this.connector.client,
      hexToUint8Array(publicKey),
      Buffer.from(dataKey).toString(),
      json,
      revision,
      opts
    );

    const signature = await this.signRegistryEntry(entry);

    return await this.connector.client.registry.setSignedEntry(hexToUint8Array(publicKey), entry, signature, opts);
  }

  // TODO: Is this public-facing?
  async signRegistryEntry(entry: RegistryEntry): Promise<Signature> {
    return this.connector.connection.remoteHandle().call("signRegistryEntry", entry);
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
