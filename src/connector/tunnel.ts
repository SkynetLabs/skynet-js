// @ts-nocheck

import { ParentHandshake, WindowMessenger } from "post-me";
import type { Connection } from "post-me";
import {
  createIframe,
  defaultHandshakeAttemptsInterval,
  defaultHandshakeMaxAttempts,
  ensureUrl,
  ProviderInfo,
  SkappInfo,
} from "skynet-interface-utils";
import type { BridgeMetadata, Schema } from "skynet-interface-utils";
import urljoin from "url-join";

import { CustomConnectOptions } from ".";
import { DacInstance } from "./instance";
import { MySkyInstance } from "./mysky";
import { SkynetClient } from "../client";
import { popupCenter } from "./utils";

export const defaultBridgeUrl = "hns:skynetbridge";

export type CustomTunnelOptions = {
  bridgeUrl?: string;
  handshakeMaxAttempts?: number;
  handshakeAttemptsInterval?: number;
};

const defaultBridgeOptions = {
  bridgeUrl: defaultBridgeUrl,
  handshakeMaxAttempts: defaultHandshakeMaxAttempts,
  handshakeAttemptsInterval: defaultHandshakeAttemptsInterval,
};

export class Tunnel {
  // ===========
  // Constructor
  // ===========

  constructor(
    protected client: SkynetClient,
    public skappInfo: SkappInfo,
    public bridgeUrl: string,
    public bridgeMetadata: BridgeMetadata,
    protected childFrame: HTMLIFrameElement,
    protected bridgeConnection: Connection,
    public options: CustomTunnelOptions
  ) {}

  static async initialize(client: SkynetClient, customOptions?: CustomTunnelOptions): Promise<Tunnel> {
    if (typeof Storage == "undefined") {
      throw new Error("Browser does not support web storage");
    }

    const opts = { ...defaultBridgeOptions, ...customOptions };

    // Initialize state.

    let bridgeUrl;
    // TODO: Replace with async versions.
    if (opts.bridgeUrl.startsWith("hns:")) {
      bridgeUrl = client.getHnsUrl(opts.bridgeUrl, { subdomain: true });
    } else {
      bridgeUrl = client.getSkylinkUrl(opts.bridgeUrl, { subdomain: true });
    }
    const skappInfo = new SkappInfo(location.hostname);

    // Create the iframe.

    const childFrame = createIframe(bridgeUrl, bridgeUrl);
    const childWindow = childFrame.contentWindow!;

    // Connect to the iframe.

    const messenger = new WindowMessenger({
      localWindow: window,
      remoteWindow: childWindow,
      remoteOrigin: "*",
    });
    const connection = await ParentHandshake(messenger, {}, opts.handshakeMaxAttempts, opts.handshakeAttemptsInterval);

    // Get the bridge metadata.

    const bridgeMetadata = await connection.remoteHandle().call("getBridgeMetadata", skappInfo);

    return new Tunnel(client, skappInfo, bridgeUrl, bridgeMetadata, childFrame, connection, opts);
  }

  // =================
  // Public Tunnel API
  // =================

  async load(schema: Schema): Promise<DacInstance> {
    const loadedDac = new DacInstance(this, schema);
    return loadedDac;
  }

  async loadMySky(): Promise<MySkyInstance> {
    const loadedMySky = new MySkyInstance(this);
    return loadedMySky;
  }

  async call(dacName: string, method: string, _schema: Schema, ...args: unknown[]): Promise<unknown> {
    // TODO: Add checks for valid parameters and return value. Should be in skynet-provider-utils and should check for reserved names.

    return this.bridgeConnection.remoteHandle().call("call", dacName, method, ...args);
  }

  async connectPopup(dacName: string, opts: CustomConnectOptions): Promise<void> {
    // Launch router

    this.launchRouter(opts.providers);

    // Wait for bridge to complete the connection.

    return this.bridgeConnection.remoteHandle().call("connectPopup", dacName, opts);
  }

  async connectSilent(dacName: string): Promise<void> {
    await this.bridgeConnection.remoteHandle().call("connectSilent", dacName);
  }

  /**
   * Destroys the bridge by:
   *
   * 1. unloading the providers on the bridge,
   *
   * 2. closing the bridge connection,
   *
   * 3. closing the child iframe
   */
  async destroy(): Promise<void> {
    // TODO: For all connected dacs, send a destroyProvider call.

    // TODO: Delete all connected dacs.

    // Close the bridge connection.
    this.bridgeConnection.close();

    // Close the child iframe.
    if (this.childFrame) {
      this.childFrame.parentNode!.removeChild(this.childFrame);
    }
  }

  async disconnect(dacName: string): Promise<void> {
    await this.bridgeConnection.remoteHandle().call("disconnect", dacName);
  }

  async logout(dacName: string): Promise<void> {
    await this.bridgeConnection.remoteHandle().call("logout", dacName);
  }

  async loginPopup(dacName: string, opts: CustomConnectOptions): Promise<void> {
    // Launch router

    const routerWindow = await this.launchRouter(opts.providers);

    // Wait for bridge to complete the connection.

    return this.bridgeConnection
      .remoteHandle()
      .call("loginPopup", dacName, opts)
      .catch((err) => {
        routerWindow.close();
        throw err;
      });
  }

  async loginSilent(dacName: string): Promise<void> {
    await this.bridgeConnection.remoteHandle().call("loginSilent", dacName);
  }

  /**
   * Restarts the bridge by destroying it and starting it again.
   */
  async restart(): Promise<Tunnel> {
    await this.destroy();
    return Tunnel.initialize(this.client, this.options);
  }

  // =======================
  // Internal Tunnel Methods
  // =======================

  // TODO: should check periodically if window is still open.
  /**
   * Creates window with router and waits for a response.
   */
  protected async launchRouter(providers: Array<ProviderInfo> | undefined): Promise<Window> {
    if (!providers) {
      providers = [];
    }
    const providersString = JSON.stringify(providers);

    // Set the router URL.
    const bridgeMetadata = this.bridgeMetadata;
    let routerUrl = urljoin(this.bridgeUrl, bridgeMetadata.relativeRouterUrl);
    const skappInfoString = JSON.stringify(this.skappInfo);
    routerUrl = `${routerUrl}?skappInfo=${skappInfoString}&providers=${providersString}`;

    // Open the router.
    return popupCenter(routerUrl, bridgeMetadata.routerName, bridgeMetadata.routerW, bridgeMetadata.routerH);
  }
}
