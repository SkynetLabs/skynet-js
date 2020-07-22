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

## Docs: using standalone function

### async upload(portalUrl, file, [options])

```javascript
import { upload } from "skynet-js";
```

Use the `portalUrl` to upload `file` contents.

`portalUrl` (string) - The string portal url.

`file` (File) - The file to upload.

`options.onUploadProgress` (function) - Optional callback to track progress.

Returns a promise that resolves with a `{ skylink }` or throws `error` on failure.

```javascript
const onUploadProgress = (progress, { loaded, total }) => {
  console.info(`Progress ${Math.round(progress * 100)}%`);
};

try {
  const { skylink } = await upload(portalUrl, file, { onUploadProgress });
} catch (error) {
  console.log(error);
}
```

### async uploadDirectory(portalUrl, directory, filename, [options])

```javascript
import { uploadDirectory } from "skynet-js";
```

Use the `portalUrl` to upload `directory` contents as a `filename`.

`portalUrl` (string) - The string portal url.

`directory` (Object) - Directory map `{ "file1.jpeg": <File>, "subdirectory/file2.jpeg": <File> }`

`filename` (string) - Output file name (directory name).

`options.onUploadProgress` (function) - Optional callback to track progress.

Returns a promise that resolves with a `{ skylink }` or throws `error` on failure.

#### Browser example

```javascript
import { getRelativeFilePath, getRootDirectory, uploadDirectory } from "skynet-js";

// Assume we have a list of files from an input form.
const filename = getRootDirectory(files[0]);
const directory = files.reduce((acc, file) => {
  const path = getRelativeFilePath(file);

  return { ...acc, [path]: file };
}, {});

try {
  const directory = files.reduce((acc, file) => {
    const path = getRelativeFilePath(file);

    return { ...acc, [path]: file };
  }, {});

  const { skylink } = await uploadDirectory(portalUrl, directory, filename);
} catch (error) {
  console.log(error);
}
```

### download(portalUrl, skylink)

```javascript
import { download } from "skynet-js";
```

Use the `portalUrl` to download `skylink` contents.

`portalUrl` (string) - The string portal url.

`skylink` (string) - 46 character skylink.

Returns nothing.

### open(portalUrl, skylink)

```javascript
import { open } from "skynet-js";
```

Use the `portalUrl` to open `skylink` in a new browser tab. Browsers support opening natively only limited file extensions like .html or .jpg and will fallback to downloading the file.

`portalUrl` (string) - The string portal url.

`skylink` (string) - 46 character skylink.

Returns nothing.

### getDownloadUrl(portalUrl, skylink, [options])

```javascript
import { getDownloadUrl } from "skynet-js";
```

Use the `portalUrl` to generate direct `skylink` url.

`portalUrl` (string) - The string portal url.

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

## Docs: using SkynetClient

```javascript
import SkynetClient from "skynet-js";

const client = new SkynetClient("https://siasky.net");
```

Client implements all the standalone functions as methods with bound `portalUrl` so you don't need to repeat it every time.
