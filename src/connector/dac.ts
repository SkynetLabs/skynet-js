import { Permission } from "skynet-interface-utils";

import { Connector } from "./base";

export class Dac {
  [index: string]: Function;

  static init(connector: Connector): Dac {
    // Return a proxy on the DAC which intercepts all method calls and returns a
    // function that calls that method on the remote handle.
    return new Proxy(new Dac(), {
      get(_target, name, _receiver) {
        return function () {
          // TODO: Remove once this has been tested.
          console.log(name, arguments);
          // connector.connection.remoteHandle().call(name, ...arguments);
        };
      },
    });
  }
}
