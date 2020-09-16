# Changelog

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
