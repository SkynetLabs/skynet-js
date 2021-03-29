# Changelog (Beta)

_Beta versions are released on the `beta` stream. The latest beta can be installed with `npm install skynet-js@beta`._

For the latest stable changes, see [CHANGELOG.md](./CHANGELOG.md).

## [3.0.3-beta]

### Added

-

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
