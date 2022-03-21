# Changelog (Beta)

_Beta versions are released on the `beta` stream. The latest beta can be installed with `npm install skynet-js@beta`._

For the latest stable changes, see [CHANGELOG.md](./CHANGELOG.md).

## [4.0.27-beta]

### Added

- Throws error when passing both dev and alpha options for MySky (#257). by @amberm31 in https://github.com/SkynetLabs/skynet-js/pull/352

### Changed

- Mysky login flow fixes by @m-cat in https://github.com/SkynetLabs/skynet-js/pull/403

## [4.0.26-beta]

### Added

- Added SkyDB V2.
  - SkyDB V2 can be accessed with `client.dbV2` and `mySky.dbV2`.
  - SkyDB V2 methods use a revision number cache internally,
    improving performance and correctness.
  - `dbV2.setJSON` does not make a network request to get the latest revision
    number, so you must always call `dbV2.getJSON` first.
- Errors caused by network requests to `skyd` are now type
  `ExecuteRequestError`.
  - This error type is fully compatible with `AxiosError`.
  - Errors from failed requests now contain a message with the original message
    from axios as well as the full context from `skyd`.
  - `ExecuteRequestError` also contains `.responseMessage` and
    `.responseStatus`.
  - `ExecuteRequestError` can be used with `instanceof` (unlike AxiosError).
- Parallel uploads for large files have been fixed and re-enabled. This should
  improve performance.

## [4.0.25-beta]

### Added

- Add option for portal API keys and env var for integration tests

## [4.0.24-beta]

### Added

- Added ability to set custom cookie in integration tests with the `SKYNET_JS_INTEGRATION_TEST_CUSTOM_COOKIE` env var.

## [4.0.23-beta]

### Changed

- Fix critical tus upload bug.

## [4.0.22-beta]

Revert `4.0.21-beta`.

## [4.0.21-beta]

### Changed

- **[Breaking change]** - SkyDB methods now use a revision number cache
  internally, improving performance and correctness. `setJSON` no longer makes a
  network request to get the latest revision number, so you must always call
  `getJSON` first.
- **[Breaking change]** - Errors from `skyd` requests are now type
  `ExecuteRequestError` as opposed to `AxiosError`. The axios error can be
  retrieved with `.originalError`.
- Error messages from `skyd` requests now contain the full, descriptive error
  response returned from `skyd`.
- Parallel uploads for large files have been fixed and re-enabled. This should
  improve performance.

### Added

- Added exports for encryption utilities `decryptJSONFile`, `encryptJSONFile`,
  `ENCRYPTED_JSON_RESPONSE_VERSION`, and `EncryptedJSONResponse`.

## [4.0.20-beta]

### Added

- Add MySky ID verification
  - `mySky.signMessage`
  - `mySky.verifyMessageSignature`
- Expose `executeRequest`

### Changed

- Try resolving the portal URL again if the previous attempt failed

## [4.0.19-beta]

### Changed

- Revert tus parallel uploads due to bug with chunking.
- Fixed `downloadFileHns` to take `CustomHnsDownloadOptions`.

## [4.0.18-beta]

### Added

- Add missing entry data methods
  - mySky.deleteEntryData
  - db.getEntryData, db.setEntryData, db.deleteEntryData

## [4.0.17-beta]

### Changed

- Fixed some bugs affecting the MySky UI window.

## [4.0.16-beta]

### Added

- Added `mySky.isBrowserSupported` method to check for unsupported browsers.

## [4.0.15-beta]

### Changed

- Downloads now verify the registry proofs returned from the portal.
- Large file uploads now upload in parallel for more efficient uploads.
- Deprecated `client.registry.getEntryLink` in flavor of the standalone and non-async `getEntryLink` function.

### Added

- Added `validateRegistryProof` function.
- Added the `errorPages` and `tryFiles` options for directory uploads.
- Exported some crypto length constants.

## [4.0.14-beta]

### Changed

- Include tryfiles metadata

## [4.0.13-beta]

### Added

- Added onDownloadProgress client option.

### Changed

- Updated default requested permissions when `skappDomain` != skapp URL to include Discoverable Write.
- Removed case sensitivity from MySky URL and domain processing.

## [4.0.12-beta]

### Added

- Encrypted files API.
  - `mySky.setJSONEncrypted`
  - `mySky.getJSONEncrypted`
  - `mySky.getEncryptedFileSeed`
  - `file.getJSONEncrypted`

### Changed

- Export MySky as value instead of as type + minor fixes.
- Error reporting for large files has been improved.

## [4.0.11-beta]

### Changed

- Fixed large file upload cookies and sticky sessions.

### Added

- Added `client.pinSkylink`.

## [4.0.10-beta]

### Changed

- Fixed `mySky.getEntryLink` and `file.getEntryLink` bug.

## [4.0.9-beta]

### Removed

- **[Breaking change]** Removed `merkleRoot` and `bitfield` from upload response.

### Added

- Added support for large file uploads. The tus protocol will be used for files greater than 40MiB in size.
- Added `convertSkylinkToBase64`.
- Added `mySky.getEntryData`, `mySky.setEntryData`, and `file.getEntryData`.
- Added `range` option to download options.

## [4.0.8-beta]

### Changed

- **[Breaking change]** The `sia:` skylink prefix has been changed to `sia://`.
- **[Breaking change]** Added missing `sia://` prefixes to the skylinks returned from SkyDB and MySky.
- The `resolveHNS` method now works for Handshake domains with `skyns://` HNS entries.

### Added

- Added `db.deleteJSON` and `mySky.deleteJSON`.
- Added `db.setDataLink`.
- Added `isSkylinkV1` and `isSkylinkV2`.
- Added `file.getEntryLink`.
- `getMetadata` now returns the skylink and portal URL again, as it did prior to `4.0.6-beta`.
- Exported `Keypair` and `KeyPairAndSeed` crypto types.

### Removed

- **[Breaking change]** Removed `uriHandshakeResolverPrefix`.

## [4.0.7-beta]

### Changed

- **[Breaking change]** Registry entries now contain `data` that is type `Uint8Array` instead of `string`.
- **[Breaking change]** `getHnsUrl` now defaults to `subdomain: true`.

### Added

- Added `mySky.setDataLink`.

## [4.0.6-beta]

### Changed

- **[Breaking change]** `getFileContent` and `getFileContentHns` no longer return metadata objects.
- **[Breaking change]** Remove `noResponseMetadata` custom option from download and HNS download methods.
- **[Breaking change]** `getMetadata` now takes a `CustomGetMetadataOptions` object for custom options.
- **[Breaking change]** Rename `resolveHns` option `endpointDownloadHnsres` to `endpointResolveHns`.

### Removed

- **[Breaking change]** `getMetadata` now only returns the metadata, and not the content-type, skylink, or portal URL. (Note: The skylink and portal URL were added back in `v4.0.8-beta`.)

## [4.0.5-beta]

### Added

- Added `cachedDataLink` option to `registry.getJSON`. This lets us avoid getting the data again if the latest data link matches the cached data link.
- Added `customCookie` client option.

### Changed

- Make datapath functions `client.getFullDomainUrl` and `client.extractDomain` when paths are included, and for localhost domains/urls.
- Fixed build for CommonJS and React projects.

## [4.0.4-beta]

### Added

- Pass custom userID options to mysky

## [4.0.3-beta]

### Changed

- **[Breaking change]** Renamed SkyDB `skylink` response field to `dataLink`.

### Added

- Added `registry.getEntryLink` and `mysky.getEntryLink`.
- Added `client.loadMySky` `alpha` option, allowing access to the experimental alpha MySky.

## [4.0.2-beta]

### Changed

- Expanded `client.extractDomain` to also work with input URLs.

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
