# Changelog

For the latest beta changes, see [CHANGELOG-BETA.md](./CHANGELOG-BETA.md).

## [3.0.2]

### Added

- Add portalUrl response field to `getFileContents` and `getMetadata`.

### Changed

- A new optimization causes `db.setJSON` to complete significantly faster.
- The size of the bundled SDK has been reduced by more than 60% by changing crypto dependencies.
- Fix a bug where registry entries with empty data were rejected.

## [3.0.0]

[Updating Guide](https://siasky.net/docs/v3/#updating-from-v2)

### Added

- `getFileContent` and `getFileContentHns` methods have been added for getting the content of a file from a skylink or Handshake domain without downloading the file in-browser.
- `noResponseMetadata` option was added to the download options.

### Changed

- **[Breaking change]** Entry revisions are now `bigint` instead of `number`.
- **[Breaking change]** Upload methods return full objects instead of just a skylink string.
- **[Breaking change]** Upload request methods were removed.
- **[Breaking change]** `getMetadata` returns a full object containing the metadata in a subfield.
- **[Breaking change]** The registry timeout has changed to take seconds instead of milliseconds.
- **[Breaking change]** `db.getJSON` can return destructured nulls instead of null
- **[Breaking change]** `registry.getEntry` only returns `null` on entry-not-found.
- Almost every API method now has the potential to throw. A common cause would be wrongly-typed inputs to a method, which are now checked.

### Removed

- **[Breaking change]** `executeRequest` was removed.

## [2.9.0]

### Added

- Support for downloading skylinks with paths (either pre-encoded in the skylink, or with the `path` parameter not encoded).
- Support for returning skylinks from `getSkylinkUrl` and `downloadFile` in subdomain form.
- Added `includePath`, `onlyPath`, and `fromSubdomain` options to `parseSkylink`, allowing getting the path with/without the skylink as well as parsing skylinks in base32 subdomain form.

### Changed

- Fixed bug in `getJSON` where fetching an inexistent entry would cause an error.

## [2.8.0]

### Added

- `downloadFile` and `getSkylinkUrl` now accept a `subdomain` option which makes them return the skylink in subdomain format.
- `parseSkylink` now accepts a `subdomain` option which parses the skylink as a base32 subdomain in a URL.

### Changed

- Trying to use the skykeyName or skykeyId parameters now results in an error, as previously users may not have realized they were unimplemented.

## [2.7.0]

_Note: this version contains breaking changes to `deriveChildSeed`._

### Changed

- **[Breaking change]** Fix `deriveChildSeed` bugs. It will now return hex-encoded strings. Note that it will now return different values than before these bugs were fixed.
- Fix `setJSON` function not using hex-encoded publickeys when making its request.
- Do not use a timeout for `setEntry` by default (was 5s previously).
- Fix a bug when calling `setJSON` with `revision = 0` where `setJSON` would fetch the latest revision anyway.

## [2.6.0]

### Added

- Add `getEntryUrl`

### Changed

- Fix `genKeyPair*` functions

## [2.5.0]

_Note: this version contains breaking changes in the SkyDB and Registry APIs._

### Changed

- **[Breaking change]** Rename `keyPairFromSeed` to `genKeyPairFromSeed` and have it return keys in the form of hex strings.
- **[Breaking change]** Rename `generateKeyPairAndSeed` to `genKeyPairAndSeed` and have it return keys in the form of hex strings.
- **[Breaking change]** Use hex strings as keys as inputs to `getJSON`, `setJSON`, `getEntry`, and `setEntry`.
- **[Breaking change]** `setEntry` no longer takes a `datakey` argument as it is already in `entry`.

## [2.4.0]

### Changed

- Add crypto API for generating seeds and deriving subkeys.

## [2.3.1]

### Changed

- Fix compatibility issue that made `getEntry` not work in the browser.

## [2.3.0]

### Changed

- Simplified registry API.

## [2.2.0]

### Changed

- Change SkyDB and Registry APIs.

## [2.1.1]

### Changed

- Improve timeout handling for SkyDB
- Extend end-to-end tests

## [2.1.0]

### Added

- Add SkyDB support

### Changed

- Move to Typescript

## [2.0.9]

### Changed

- Fix some bugs with skylink parsing.

## [2.0.8]

### Changed

- Revert 2.0.7 and fix `uploadFile` filename bug.

## [2.0.7]

### Changed

- Revert: "Fixed a bug causing `uploadFile` to not work." introduced in 2.0.4

## [2.0.6]

### Changed

- Fixed a bug in server-side rendering where `typeof` was not used for `window`.

## [2.0.5]

### Changed

- Fixed a bug in server-side rendering where `window` was `undefined`.

## [2.0.4]

### Changes

- Fixed a bug causing `uploadFile` to not work.

## [2.0.3]

### Changed

- Remove some test code that made it into the published version.

## [2.0.2]

### Added

- MIT license

### Changed

- `regeneratorRuntime` error when packaging with `webpack` has been fixed.

## [2.0.1]

### Changed

- Publish only compiled version (resolves issues with webpack).

## [2.0.0]

_Prior version numbers skipped to maintain parity with API._

### Added

- `downloadFileHns`, `openFileHns`, `resolveSkylinkHns`
- `getHnsUrl`, `getHnsresUrl`
- `customFilename` and `customDirname` upload options

### Changed

- `download` and `open` were renamed to `downloadFile` and `openFile`.
- `upload` was renamed to `uploadFile` and the response was changed to only
  include a skylink. To obtain the full response as in the old `upload`, use the
  new `uploadFileRequest`.
- `getDownloadUrl` has been renamed to `getSkylinkUrl`.
- Connection options can now be passed to the client, in addition to individual
  API calls, to be applied to all API calls.
- The `defaultPortalUrl` string has been renamed to `defaultSkynetPortalUrl` and
  `defaultPortalUrl` is now a function.

## [0.1.0] - 2020-07-29

### Added

- New `SkynetClient` class that must be initialized to call methods such as
  `upload` and `download`.
- New utility helpers such as `getRelativeFilePath` and `defaultPortalUrl`.

### Changed

- Most standalone functions are now methods on the `SkynetClient`. Previous code
  that was calling `upload(...)` instead of `client.upload(...)` will no longer
  work.
