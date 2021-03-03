import { Connection, ParentHandshake, WindowMessenger } from "post-me";
import { createIframe, defaultHandshakeAttemptsInterval, defaultHandshakeMaxAttempts } from "skynet-interface-utils";

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
    protected client: SkynetClient,
    protected childFrame: HTMLIFrameElement,
    public connection: Connection,
    public options: CustomConnectorOptions
  ) {}

  // Static initializer

  static async init(client: SkynetClient, domain: string, customOptions?: CustomConnectorOptions): Promise<Connector> {
    const opts = { ...defaultConnectorOptions, ...customOptions };

    const componentUrl = await client.getComponentUrl(domain);

    // Create the iframe.

    const childFrame = createIframe(componentUrl, componentUrl);
    const childWindow = childFrame.contentWindow!;

    // Connect to the iframe.

    const messenger = new WindowMessenger({
      localWindow: window,
      remoteWindow: childWindow,
      remoteOrigin: "*",
    });
    const connection = await ParentHandshake(messenger, {}, opts.handshakeMaxAttempts, opts.handshakeAttemptsInterval);

    // Construct the component connector.

    return new Connector(componentUrl, client, childFrame, connection, opts);
  }
}
