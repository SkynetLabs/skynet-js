import { downloadFile, downloadFileHns, openFile, openFileHns } from "../download/web";
import {
  uploadFile,
  uploadDirectory,
  uploadDirectoryRequest,
  uploadFileRequest,
  uploadFileContent,
  uploadFileContentRequest,
} from "../upload/web";
import { SkynetClient as Client } from "./index";

export class SkynetClient extends Client {
  // Download
  downloadFile = downloadFile;
  downloadFileHns = downloadFileHns;
  openFile = openFile;
  openFileHns = openFileHns;

  // Upload
  uploadFile = uploadFile;
  protected uploadFileRequest = uploadFileRequest;
  uploadDirectory = uploadDirectory;
  protected uploadDirectoryRequest = uploadDirectoryRequest;
  uploadFileContent = uploadFileContent;
  protected uploadFileContentRequest = uploadFileContentRequest;
}
