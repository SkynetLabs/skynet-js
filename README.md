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

## Docs

### Using SkynetClient

Client implements all the standalone functions as methods with bound `portalUrl` so you don't need to repeat it every time.

`portalUrl` (string) - Optional portal url. If not specified, will try to use the current portal that the sky app is running inside of.

```javascript
import { SkynetClient } from "skynet-js";

const client = new SkynetClient("https://siasky.net");
```

Calling `SkynetClient` without parameters will use the URL of the current portal that is running the skapp (sky app).

### async upload(file, [options])

Use the client to upload `file` contents.

`file` (File) - The file to upload.

`options.APIKey` (string) - Optional API key password for authentication.

`options.onUploadProgress` (function) - Optional callback to track progress.

Returns a promise that resolves with a `{ skylink }` or throws `error` on failure.

```javascript
import { SkynetClient } from "skynet-js";

const onUploadProgress = (progress, { loaded, total }) => {
  console.info(`Progress ${Math.round(progress * 100)}%`);
};

async function uploadExample() {
  try {
    const client = new SkynetClient();
    const { skylink } = await client.upload(file, { onUploadProgress });
  } catch (error) {
    console.log(error);
  }
}
```

With authentication:

```javascript
import { SkynetClient } from "skynet-js";

async function authenticationExample() {
  try {
    const client = new SkynetClient("https://my-portal.net");
    const { skylink } = await client.upload(file, { APIKey: "foobar" });
  } catch (error) {
    console.log(error);
  }
}
```

### async uploadDirectory(directory, filename, [options])

Use the client to upload `directory` contents as a `filename`.

`directory` (Object) - Directory map `{ "file1.jpeg": <File>, "subdirectory/file2.jpeg": <File> }`

`filename` (string) - Output file name (directory name).

`options.onUploadProgress` (function) - Optional callback to track progress.

Returns a promise that resolves with a `{ skylink }` or throws `error` on failure.

#### Browser example

```javascript
import { getRelativeFilePath, getRootDirectory, SkynetClient } from "skynet-js";

// Assume we have a list of files from an input form.

async function uploadDirectoryExample() {
  try {
    // Get the directory name from the list of files.
    // Can also be named manually, i.e. if you build the files yourself
    // instead of getting them from an input form.
    const filename = getRootDirectory(files[0]);

    // Use reduce to build the map of files indexed by filepaths
    // (relative from the directory).
    const directory = files.reduce((accumulator, file) => {
      const path = getRelativeFilePath(file);

      return { ...accumulator, [path]: file };
    }, {});

    const client = new SkynetClient();
    const { skylink } = await client.uploadDirectory(directory, filename);
  } catch (error) {
    console.log(error);
  }
}
```

### download(skylink)

```javascript
import { SkynetClient } from "skynet-js";

// Assume we have a skylink e.g. from a previous upload.

try {
  const client = new SkynetClient();
  client.download(skylink);
} catch (error) {
  console.log(error);
}
```

Use the client to download `skylink` contents.

`skylink` (string) - 46 character skylink.

Returns nothing.

### open(skylink)

```javascript
import { SkynetClient } from "skynet-js";
```

Use the client to open `skylink` in a new browser tab. Browsers support opening natively only limited file extensions like .html or .jpg and will fallback to downloading the file.

`skylink` (string) - 46 character skylink.

Returns nothing.

### getDownloadUrl(skylink, [options])

```javascript
import { SkynetClient } from "skynet-js";
```

Use the client to generate direct `skylink` url.

`skylink` (string) - 46 character skylink.

`options.download` (boolean) - Option to include download directive in the url that will force a download when used. Defaults to `false`.

### parseSkylink(skylink)

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
