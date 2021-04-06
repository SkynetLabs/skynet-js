import { Connection, ParentHandshake, WindowMessenger } from "post-me";
import { createIframe, defaultHandshakeAttemptsInterval, defaultHandshakeMaxAttempts } from "skynet-mysky-utils";

import { SkynetClient } from "../client";

export type CustomConnectorOptions = {
  handshakeMaxAttempts?: number;
  handshakeAttemptsInterval?: number;
};

const defaultConnectorOptions = {
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
    const domainUrl = await client.getFullDomainUrl(domain);

    // Create the iframe.

    const childFrame = createIframe(domainUrl, domainUrl);
    const childWindow = childFrame.contentWindow!;

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
