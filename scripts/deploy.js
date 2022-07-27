/**
 * Script to deploy skynet-js to an hns domain.
 *
 * # Example usage
 *
 * $ SKYNET_JS_DEPLOY_SEED="..." node ./scripts/deploy.js
 *
 * $ SKYNET_JS_DEPLOY_SEED="..." SKYNET_JS_DEPLOY_DOMAIN="my-domain" node ./scripts/deploy.js --portal-url https://skynetpro.net --skynet-api-key <api-key>
 *
 * # Options
 *
 * --portal-url        Your preferred Skynet portal.
 * --skynet-api-key    API key for the portal.
 * --hns-domain        The HNS domain to deploy to. Can also use
 *                     the 'SKYNET_JS_DEPLOY_DOMAIN' env var.
 * --first-time        Set this if you are deploying to a domain
 *                     for the first time.
 *
 * # First time use
 *
 * If you are doing a first-time deploy, run with '--first-time'. This will
 * generate the required seed and skip the initial download.
 *
 * After the upload, please set the TXT record for the HNS domain to the
 * resulting resolver skylink.
 */

/* eslint-disable @typescript-eslint/no-var-requires */

const {
  genKeyPairFromSeed,
  genKeyPairAndSeed,
  SkynetClient,
  stringToUint8ArrayUtf8,
  uriSkynetPrefix,
} = require("@skynetlabs/skynet-nodejs");

const fs = require("fs");
const fse = require("fs-extra");
const parseArgs = require("minimist");
const process = require("process");
const tar = require("tar-fs");

// The env var with the secret seed phrase to deploy with. (Required if not --first-time)
const deploySeedEnvVar = "SKYNET_JS_DEPLOY_SEED";
// The env var with the HNS domain to deploy to. (Optional, can also pass --hns-domain)
const deployDomainEnvVar = "SKYNET_JS_DEPLOY_DOMAIN";

// Get arguments.
const argv = parseArgs(process.argv.slice(2));
// Portal URL.
const portalUrl = argv["portal-url"] || "https://siasky.net";
// API key for portal.
const skynetApiKey = argv["skynet-api-key"] || undefined;
// The HNS domain to deploy to.
const hnsDomain = argv["hns-domain"] || process.env[deployDomainEnvVar] || "skynet-js";
// Whether we should treaet this as a first-time deploy.
const firstTime = argv["first-time"] || false;

// The location of the bundle to deploy. Must be a folder.
const bundlePath = "bundle";
// Location of package.json, used to get the latest version.
const packageJson = "../package.json";
// Set to true to skip the download. Useful for debugging.
const skipDownload = false;
// Set to true to skip the upload. Useful for debugging.
const skipUpload = false;
const dataKey = "skynet-js";
const versionsDir = "versions";
const versionsTarFile = `${versionsDir}.tar`;

void (async () => {
  const client = new SkynetClient(portalUrl, { skynetApiKey });

  // Get the seed.

  let seed = process.env[deploySeedEnvVar];
  if (!seed && firstTime) {
    seed = genKeyPairAndSeed().seed;
    console.log(`Generated seed **KEEP THIS SECRET**: ${seed}`);
  }

  // Validation.

  if (!fs.existsSync(bundlePath)) {
    throw new Error(`No bundle found at path '${bundlePath}'. Run 'yarn build-deploy' first.`);
  }
  if (!skipUpload && !seed) {
    throw new Error(
      `Seed not found (required for upload), make sure 'SKYNET_JS_DEPLOY_SEED' is set. Run with '--first-time' if you do not have a seed.`
    );
  }

  // Get the latest version from package.json.

  const { version } = require(packageJson);
  console.log(`Version: ${version}`);

  // Download the existing version directory. Skip if this is a first-time deploy.

  if (fs.existsSync(versionsDir)) {
    fs.rmSync(versionsDir, { recursive: true });
  }
  if (fs.existsSync(versionsTarFile)) {
    fs.rmSync(versionsTarFile);
  }

  if (!skipDownload && !firstTime) {
    try {
      console.log(`Downloading HNS domain '${hnsDomain}' -> '${versionsTarFile}'`);
      await client.downloadFileHns(versionsTarFile, hnsDomain, { format: "tar" });
      // Untar to versions dir.
      console.log(`Untarring '${versionsTarFile}' -> '${versionsDir}'`);
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
      console.error(
        `Error downloading from HNS domain 'hnsDomain'. If this is a first-time deploy, please run with '--first-time'`
      );
      throw error;
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
  console.log(`Copying '${bundlePath}' -> '${destinationDir}'`);
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

    console.log(`Updating '${dataKey}' registry entry with skylink`);
    const { publicKey, privateKey } = genKeyPairFromSeed(seed);
    const { entry } = await client.registry.getEntry(publicKey, dataKey);
    await client.registry.setEntry(privateKey, {
      dataKey,
      data: stringToUint8ArrayUtf8(skylink),
      // Don't assert that the entry is null for first-time deploys, since we
      // may be re-using a previously-used HNS domain.
      revision: (entry?.revision || BigInt(-1)) + BigInt(1),
    });

    // Print the resolver skylink.

    const resolverSkylink = await client.registry.getEntryLink(publicKey, dataKey);
    console.log(`Resolver skylink: ${resolverSkylink}`);
  }
})();
