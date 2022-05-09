# Changelog

All notable changes to this project will be documented in this file.

For the latest beta changes, see [CHANGELOG-BETA.md](./CHANGELOG-BETA.md).

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Types of changes:

- `Added` for new features.
- `Changed` for changes in existing functionality.
- `Removed` for now removed features.

## [Unreleased]

### Added

- Added `client.getFileContentBinary` and `client.getFileContentBinaryHns` methods for downloading binary data.
- Added `chunkSizeMultiplier` option for large file uploads.
- Added `staggerPercent` option for more efficient uploading of large file uploads.

## [4.1.0]

### Breaking Changes

#### Changed

##### SkyDB

- `client.db.getJSON` no longer returns `{ data, revision }` but instead `{ data, skylink }`.
- `client.db.setJSON` no longer accepts a revision number.
- Renamed SkyDB `skylink` response field to `dataLink`.
- Added missing `sia://` prefixes to the skylinks returned from SkyDB.

##### Registry

- Renamed `RegistryEntry.datakey` to `dataKey` for consistency.
- Registry entries now contain `data` that is type `Uint8Array` instead of `string`.

##### Download

- `getSkylinkUrl`, `downloadFile`, `openFile`, and the HNS equivalents are all now `async`.
- `getFileContent` and `getFileContentHns` no longer return metadata objects.
- Remove `noResponseMetadata` custom option from download and HNS download methods.
- `getMetadata` now takes a `CustomGetMetadataOptions` object for custom options.
- Rename `resolveHns` option `endpointDownloadHnsres` to `endpointResolveHns`.
- `getHnsUrl` now defaults to `subdomain: true`.

##### Client

- `client.portalUrl` is now an async method instead of a variable.

##### Misc

- The `sia:` skylink prefix has been changed to `sia://`.

#### Removed

- The `getEntry` `timeout` option has been removed as it no longer has an effect.
- Removed `uriHandshakeResolverPrefix`.
- Removed `merkleRoot` and `bitfield` from upload response.

### Other Changes

#### Added

##### SkyDB V2

- Added SkyDB V2.
  - SkyDB V2 can be accessed with `client.dbV2` and `mySky.dbV2`.
  - SkyDB V2 methods use a revision number cache internally,
    improving performance and correctness.
  - `dbV2.setJSON` does not make a network request to get the latest revision
    number, so you must always call `dbV2.getJSON` first.

##### Large File Uploads

- Added support for large file uploads.
- The tus protocol will be used automatically for files greater than 40MiB in size.
- Large files are uploaded in parallel chunks.

##### MySky

- Added `client.loadMySky`.
- Added `MySky` and `DacLibrary` types. See [the docs](https://sdk.skynetlabs.com/#mysky) for everything you can do with this new functionality.
- Added `client.extractDomain`, `client.getFullDomainUrl`, `extractDomainForPortal`, `getFullDomainUrlForPortal`.

##### File

- Added `client.file.getJSON`.
- Added `client.file.getJSONEncrypted`.
- Added `client.file.getEntryLink`.

##### Exports

- Added `Permission` export.
- Exported `Keypair` and `KeyPairAndSeed` crypto types.
- Added `validateRegistryProof` function.
- Exported some crypto length constants.
- Added exports for encryption utilities `decryptJSONFile`, `encryptJSONFile`,
  `ENCRYPTED_JSON_RESPONSE_VERSION`, and `EncryptedJSONResponse`.

##### SkyDB

- Added `db.deleteJSON` and `mySky.deleteJSON`.
- Added `db.setDataLink`.
- Added `db.getEntryData`, `db.setEntryData`, `db.deleteEntryData`.
- Added `cachedDataLink` option to `db.getJSON`. This lets us avoid getting the data again if the latest data link matches the cached data link.

##### Registry

- Added `getEntryLink` and `mysky.getEntryLink`.
- Added `getEntryUrlForPortal`, `getSkylinkUrlForPortal`.
- Added `signEntry` helper function.
- Added `client.registry.postSignedEntry` helper method.

##### Client

- Errors caused by network requests to `skyd` are now type
  `ExecuteRequestError`.
  - This error type is fully compatible with `AxiosError`.
  - Errors from failed requests now contain a message with the original message
    from axios as well as the full context from `skyd`.
  - `ExecuteRequestError` also contains `.responseMessage` and
    `.responseStatus`.
  - `ExecuteRequestError` can be used with `instanceof` (unlike AxiosError).
- Expose `executeRequest`.
- Added `customCookie` client option.
- Added `onDownloadProgress` client option.
- Added `client.initPortalUrl` method to manually initialize the portal URL before it is needed.

##### Uploads

- Added the `errorPages` and `tryFiles` options for directory uploads.

##### Testing

- Add option for portal API keys and env var for integration tests
- Added ability to set custom cookie in integration tests with the `SKYNET_JS_INTEGRATION_TEST_CUSTOM_COOKIE` env var.

##### Misc

- Added `client.pinSkylink`.
- Added `isSkylinkV1` and `isSkylinkV2`.
- Added `range` option to download options.
- Added `convertSkylinkToBase64`.

#### Changed

##### Client

- Try resolving the portal URL again if the previous attempt failed.
- Error messages from `skyd` requests now contain the full, descriptive error
  response returned from `skyd`.
- The SDK now supports cookies with requests that are "same-site" but "cross-origin." This allows accounts to be associated with requests made to API endpoints at the base portal URL.

##### Misc

- Downloads now verify the registry proofs returned from the portal.
- Fixed build for CommonJS and React projects.
- Fixed Range Error on unicode data keys.
- The `resolveHNS` method now works for Handshake domains with `skyns://` HNS entries.

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
