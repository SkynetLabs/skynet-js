# skynet-js - Javascript Sia Skynet Client

A Javascript module made to simplify communication with Sia Skynet portals from the browser.

## Installing

Using npm

```sh
npm install skynet-js
```

Using yarn

```sh
yarn add skynet-js
```

## Development

- Clone the repository
- Run `yarn`
- Run `yarn test` to run the tests

## Documentation

For documentation complete with examples, please see [the Skynet SDK docs](https://nebulouslabs.github.io/skynet-docs/?javascript--browser#introduction).

### Browser Utility Functions

The following are functions provided by `skynet-js` that only make sense in the browser, and are not covered in the more general SDK docs linked above.

#### open(skylink)

```javascript
import { SkynetClient } from "skynet-js";
```

Use the client to open `skylink` in a new browser tab. Browsers support opening natively only limited file extensions like .html or .jpg and will fallback to downloading the file.

`skylink` (string) - 46 character skylink.

Returns nothing.

#### getDownloadUrl(skylink, [options])

```javascript
import { SkynetClient } from "skynet-js";
```

Use the client to generate direct `skylink` url.

`skylink` (string) - 46 character skylink.

`options.download` (boolean) - Option to include download directive in the url that will force a download when used. Defaults to `false`.

#### parseSkylink(skylink)

```javascript
import { parseSkylink } from "skynet-js";
```

Use the `parseSkylink` to extract skylink from a string.

Currently supported string types are:

- direct skylink string, for example `"XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg"`
- `sia:` prefixed string, for example `"sia:XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg"`
- `sia://` prefixed string, for example `"sia://XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg"`
- skylink from url, for example `"https://siasky.net/XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg"`

`skylink` (string) - String containing 46 character skylink.

Returns extracted skylink string or throws error.
