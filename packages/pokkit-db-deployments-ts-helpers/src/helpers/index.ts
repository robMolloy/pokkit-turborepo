export const deployPokkitDbFilesCollectionName = "deployPokkitDbFiles";
export const deployViteFilesCollectionName = "deployViteFiles";
export const deploymentTemplatesCollectionName = "deploymentTemplates";

export type TDeploymentTemplatesCreatePayload = {
  templateBody: string;
  filePath: string;
};

export const deploymentTemplatesPayloadBuilder = {
  forCreateData: <T extends TDeploymentTemplatesCreatePayload>(p: T) => p as T,
};

export type TDeployPokkitDbFilesCreatePayload = {
  buildFile: File;
  settingsFile?: File;
  secretsFile?: File;
  collectionsFile?: File;
  portNumber?: number;
  sslPortNumber?: number;
  superuserEmail: string;
  superuserPassword: string;
};

export const deployPokkitDbFilesPayloadBuilder = {
  forCreateData: <T extends TDeployPokkitDbFilesCreatePayload>(p: T) => p as T,
};

export type TDeployViteFilesCreatePayload = {
  zipFile: File;
  portNumber?: number;
  sslPortNumber?: number;
};

export const deployViteFilesPayloadBuilder = {
  forCreateData: <T extends TDeployViteFilesCreatePayload>(p: T) => p as T,
};
