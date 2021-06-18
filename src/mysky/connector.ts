/* istanbul ignore file */

import { Connection, ParentHandshake, WindowMessenger } from "post-me";
import { createIframe, defaultHandshakeAttemptsInterval, defaultHandshakeMaxAttempts } from "skynet-mysky-utils";

import { SkynetClient } from "../client";
import { addUrlQuery } from "../utils/url";

/**
 * Custom connector options.
 *
 * @property [dev] - Whether to use the dev build of mysky. It is functionally equivalent to the default production mysky, except that all permissions are granted automatically and data lives in a separate sandbox from production.
 * @property [debug] - Whether to tell mysky and DACs to print debug messages.
 * @property [alpha] - Whether to use the alpha build of mysky. This is the build where development occurs and it can be expected to break. This takes precedence over the 'dev' option if that is also set.
 * @property [handshakeMaxAttempts=150] - The amount of handshake attempts to make when starting a connection.
 * @property [handshakeAttemptsInterval=100] - The time interval to wait between handshake attempts.
 */
export type CustomConnectorOptions = {
  dev?: boolean;
  debug?: boolean;
  alpha?: boolean;
  handshakeMaxAttempts?: number;
  handshakeAttemptsInterval?: number;
};

export const defaultConnectorOptions = {
  dev: false,
  debug: false,
  alpha: false,
  handshakeMaxAttempts: defaultHandshakeMaxAttempts,
  handshakeAttemptsInterval: defaultHandshakeAttemptsInterval,
};

export class Connector {
  constructor(
    public url: string,
    public client: SkynetClient,
    public childFrame: HTMLIFrameElement,
    public connection: Connection,
    public options: CustomConnectorOptions
  ) {}

  // Static initializer

  static async init(client: SkynetClient, domain: string, customOptions?: CustomConnectorOptions): Promise<Connector> {
    const opts = { ...defaultConnectorOptions, ...customOptions };

    // Get the URL for the domain on the current portal.
    let domainUrl = await client.getFullDomainUrl(domain);
    if (opts.dev) {
      domainUrl = addUrlQuery(domainUrl, { dev: "true" });
    }
    if (opts.debug) {
      domainUrl = addUrlQuery(domainUrl, { debug: "true" });
    }
    if (opts.alpha) {
      domainUrl = addUrlQuery(domainUrl, { alpha: "true" });
    }

    // Create the iframe.

    const childFrame = createIframe(domainUrl, domainUrl);
    // The frame window should always exist. Sanity check + make TS happy.
    if (!childFrame.contentWindow) {
      throw new Error("'childFrame.contentWindow' was null");
    }
    const childWindow = childFrame.contentWindow;

    // Connect to the iframe.

    const messenger = new WindowMessenger({
      localWindow: window,
      remoteWindow: childWindow,
      remoteOrigin: "*",
    });
    const connection = await ParentHandshake(messenger, {}, opts.handshakeMaxAttempts, opts.handshakeAttemptsInterval);

    // Construct the component connector.

    return new Connector(domainUrl, client, childFrame, connection, opts);
  }

  async call(method: string, ...args: unknown[]): Promise<unknown> {
    return this.connection.remoteHandle().call(method, ...args);
  }
}
