const { genKeyPairFromSeed, SkynetClient, uriSkynetPrefix } = require("..");
const fs = require("fs");
const tar = require("tar-fs");

const hns = "skynet-js";
const dataKey = "skynet-js";
const bundlePath = "dist/bundle/index.js";
const scriptName = "index.js";
const packageJson = "../package.json";

const versionsDir = "versions";
const versionsTarFile = `${versionsDir}.tar`;

(async () => {
  const client = new SkynetClient("https://siasky.net");

  // Get the latest version from package.json.

  const pjson = require(packageJson);
  const version = pjson.version;
  console.log(`Version: ${version}`);

  // Download the existing version directory.

  if (fs.existsSync(versionsDir)) {
    fs.rmdirSync(versionsDir, { recursive: true });
  }
  try {
    console.log(`Downloading HNS domain '${hns}' to ${versionsTarFile}`);
    const { contentType } = await client.downloadFileHnsToPath(hns, versionsTarFile, { query: { format: "tar" } });
    if (!contentType || !contentType.includes("application/x-tar")) {
      throw new Error(`Downloaded file is not tar, content-type: ${contentType}`);
    }
    // Untar to versions dir.
    console.log(`Untarring ${versionsTarFile}`);
    const writer = tar.extract(versionsDir);
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

  // Copy the web bundle to the appropriate version dir.

  // Compute the destination dir.
  // TODO: Index by major version?
  let versionSubdir = version.split(".").slice(0, 2).join(".");
  const suffix = version.split("-").slice(1);
  if (suffix) {
    versionSubdir = `${versionSubdir}-${suffix}`;
  }
  const destinationDir = `${versionsDir}/${versionSubdir}`;
  const destination = `${destinationDir}/${scriptName}`;
  // Make sure the destination has permissions.
  if (fs.existsSync(destination)) {
    fs.chmodSync(destination, "777");
  }
  // Copy the bundle. destination will be created or overwritten.
  console.log(`Copying ${bundlePath} -> ${destination}`);
  fs.mkdirSync(destinationDir, { recursive: true });
  fs.copyFileSync(bundlePath, destination);

  // Upload the directory and get the skylink.

  console.log(`Uploading '${versionsDir}' dir`);
  let { skylink } = await client.uploadDirectoryFromPath(versionsDir, { disableDefaultPath: true });
  skylink = skylink.slice(uriSkynetPrefix.length);
  console.log(`Skylink: ${skylink}`);
  // Delete versionsDir.
  fs.rmdirSync(versionsDir, { recursive: true });

  // Update the registry entry.

  console.log(`Updating '${dataKey}' registry entry with skylink ${skylink}`);
  const seed = process.env.SKYNET_JS_DEPLOY_SEED;
  if (!seed) {
    throw new Error(`Seed not found, make sure SKYNET_JS_DEPLOY_SEED is set`);
  }
  const { publicKey, privateKey } = genKeyPairFromSeed(seed);
  const { entry } = await client.registry.getEntry(publicKey, dataKey);
  await client.registry.setEntry(privateKey, { datakey: dataKey, data: skylink, revision: entry.revision });

  // Print the registry URL.

  const registryUrl = client.registry.getEntryUrl(publicKey, dataKey);
  console.log(`Registry URL: ${registryUrl}`);
})().catch((e) => {
  console.log(e);
  // TODO: Print skyns:// link as well.
});
