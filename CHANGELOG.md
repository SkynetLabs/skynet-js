# Changelog

## [2.1.1]

- Improve timeout handling for SkyDB
- Extend end-to-end tests

## [2.1.0]

- Add SkyDB support
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
