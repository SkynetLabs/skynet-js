/* eslint-disable @typescript-eslint/no-var-requires */

const {
  genKeyPairFromSeed,
  SkynetClient,
  stringToUint8ArrayUtf8,
  uriSkynetPrefix,
} = require("@skynetlabs/skynet-nodejs");

const fs = require("fs");
const fse = require("fs-extra");
const process = require("process");
const tar = require("tar-fs");

// The secret seed phrase to deploy with.
const deploySeed = "SKYNET_JS_DEPLOY_SEED";
// The location of the bundle to deploy. Must be a folder.
const bundlePath = "bundle";
// Location of package.json, used to get the latest version.
const packageJson = "../package.json";
// Set to true to skip the download.
const skipDownload = false;
// Set to true to skip the upload.
const skipUpload = false;

const hnsDomain = "skynet-js";
const dataKey = "skynet-js";
const versionsDir = "versions";
const versionsTarFile = `${versionsDir}.tar`;

(async () => {
  const client = new SkynetClient("https://siasky.net");

  // Get the latest version from package.json.

  const version = require(packageJson).version;
  console.log(`Version: ${version}`);

  // Download the existing version directory.

  if (fs.existsSync(versionsDir)) {
    fs.rmSync(versionsDir, { recursive: true });
  }
  if (fs.existsSync(versionsTarFile)) {
    fs.rmSync(versionsTarFile);
  }

  if (!skipDownload) {
    try {
      console.log(`Downloading HNS domain '${hnsDomain}' to ${versionsTarFile}`);
      await client.downloadFileHns(versionsTarFile, hnsDomain, { format: "tar" });
      // Untar to versions dir.
      console.log(`Untarring ${versionsTarFile} -> ${versionsDir}`);
      const writer = tar.extract(versionsDir, {
        // Make sure all existing subfiles are readable.
        readable: true,
      });
      await new Promise((resolve, reject) => {
        fs.createReadStream(versionsTarFile).pipe(writer);
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      // Delete tar file.
      fs.unlinkSync(versionsTarFile);
    } catch (error) {
      // If there was any error, stop. The initial directory should be uploaded manually.
      console.log(error);
      return;
    }
  }

  // Copy the web bundle to the appropriate version dir.

  // Compute the destination dir.
  // TODO: Index by major version?
  let versionSubdir = version.split(".").slice(0, 2).join(".");
  const suffix = version.split("-").slice(1);
  if (suffix.length > 0) {
    versionSubdir = `${versionSubdir}-${suffix}`;
  }
  const destinationDir = `${versionsDir}/${versionSubdir}`;

  // Copy the bundle. destination will be created or overwritten.
  console.log(`Copying ${bundlePath} -> ${destinationDir}`);
  if (fs.existsSync(destinationDir)) {
    fs.rmSync(destinationDir, { recursive: true });
  }
  fs.mkdirSync(destinationDir, { recursive: true });
  fse.copySync(bundlePath, destinationDir);

  // Upload the directory and get the skylink.

  if (!skipUpload) {
    console.log(`Uploading '${versionsDir}' dir`);
    let skylink = await client.uploadDirectory(versionsDir, { disableDefaultPath: true });
    skylink = skylink.slice(uriSkynetPrefix.length);
    console.log(`Skylink: ${skylink}`);

    // Delete versionsDir.
    fs.rmSync(versionsDir, { recursive: true });

    // Update the registry entry.

    console.log(`Updating '${dataKey}' registry entry with skylink ${skylink}`);
    const seed = process.env[deploySeed];
    if (!seed) {
      throw new Error(`Seed not found, make sure SKYNET_JS_DEPLOY_SEED is set`);
    }
    const { publicKey, privateKey } = genKeyPairFromSeed(seed);
    const { entry } = await client.registry.getEntry(publicKey, dataKey);
    await client.registry.setEntry(privateKey, {
      dataKey,
      data: stringToUint8ArrayUtf8(skylink),
      revision: entry.revision + BigInt(1),
    });

    // Print the registry URL.

    const registryUrl = await client.registry.getEntryUrl(publicKey, dataKey);
    console.log(`Registry URL: ${registryUrl}`);
  }
})().catch((e) => {
  console.log(e);
});
