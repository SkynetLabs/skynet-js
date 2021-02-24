import { downloadFileHnsToPath, downloadFileToPath } from "../download/node";
import { uploadFileFromPath, uploadFileFromPathRequest } from "../upload/node";
import { SkynetClient as Client } from "./index";

export class SkynetClient extends Client {
  // Download
  downloadFileToPath = downloadFileToPath;
  downloadFileHnsToPath = downloadFileHnsToPath;

  // Upload
  uploadFileFromPath = uploadFileFromPath;
  protected uploadFileFromPathRequest = uploadFileFromPathRequest;
}
