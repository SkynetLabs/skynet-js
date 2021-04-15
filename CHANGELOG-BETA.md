# Changelog (Beta)

_Beta versions are released on the `beta` stream. The latest beta can be installed with `npm install skynet-js@beta`._

For the latest stable changes, see [CHANGELOG.md](./CHANGELOG.md).

## [4.0.1-beta]

### Changed

- **[Breaking change]** An issue with path encodings in `file.getJSON`, `mysky.getJSON` and `mysky.setJSON` has been fixed. Unfortunately the encoding had to be changed so all MySky data will be lost.
- **[Breaking change]** Renamed `RegistryEntry.datakey` to `dataKey` for consistency

### Removed

- **[Breaking change]** The `getEntry` `timeout` option has been removed as it no longer has an effect.

### Added

- `Permission` is now re-exported from `skynet-js` so that you can call `mysky.addPermissions` without requiring the `skynet-mysky-utils` dependency.

## [4.0.0-beta]

### Changed

- **[Breaking change]** `client.db.getJSON` no longer returns `{ data, revision }` but instead `{ data, skylink }`.
- **[Breaking change]** `client.db.setJSON` no longer accepts a revision number.
- **[Breaking change]** `getSkylinkUrl`, `downloadFile`, `openFile`, and the HNS equivalents are all now `async`.
- **[Breaking change]** `client.portalUrl` is now an async method instead of a variable.

- Fixed Range Error on unicode data keys.
- The SDK now supports cookies with requests that are "same-site" but "cross-origin." This allows accounts to be associated with requests made to API endpoints at the base portal URL.

### Added

#### MySky

- Added `client.loadMySky`.
- Added `MySky` and `DacLibrary` types.
- Added `client.file.getJSON`.
- Added `extractDomainForPortal`, `getFullDomainUrlForPortal`.

#### Misc

- Added `getEntryUrlForPortal`, `getSkylinkUrlForPortal`.
- Added `signEntry` helper function.
- Added `client.registry.postSignedEntry` helper method.
- Added `client.initPortalUrl` method to manually initialize the portal URL before it is needed.

## [3.0.2-beta]

### Added

- Add portalUrl response field to `getFileContents` and `getMetadata`.

### Changed

- Fix a bug where registry entries with empty data were rejected.
- The bundle size when building with webpack has been further reduced.

## [3.0.1-beta]

### Changed

- A new optimization causes `db.setJSON` to complete significantly faster.
- The size of the bundled SDK has been reduced by more than 60% by changing crypto dependencies.

## [3.0.0-beta]

[Updating Guide](https://siasky.net/docs/v3-beta/#updating-from-v2)

_This beta version is released on the `beta` stream. It can be installed with `npm install skynet-js@beta`._

### Added

- `getFileContent` and `getFileContentHns` methods have been added for getting the content of a file from a skylink or Handshake domain without downloading the file in-browser.

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
