# Changelog

## [0.1.0] - 2020-07-29

### Added

- New `SkynetClient` class that must be initialized to call methods such as `upload` and `download`.
- New utility helpers such as `getRelativeFilePath` and `defaultPortalUrl`.

### Changed

- Most standalone functions are now methods on the `SkynetClient`. Previous code that was calling `upload(...)` instead of `client.upload(...)` will no longer work.
