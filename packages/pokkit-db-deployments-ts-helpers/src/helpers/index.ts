export const deploymentsCollectionName = "deployments";
export const nginxTemplatesCollectionName = "nginxTemplates";

export type TDeploymentsCreatePayload = {
  buildFile: File;
  settingsFile?: File;
  secretsFile?: File;
  collectionsFile?: File;
  portNumber?: number;
  superuserEmail: string;
  superuserPassword: string;
};

export const deploymentsPayloadBuilder = {
  forCreateData: <T extends TDeploymentsCreatePayload>(p: T) => p as T,
};

export type TNginxTemplatesCreatePayload = {
  templateBody: string;
  filePath: string;
};

export const nginxTemplatesPayloadBuilder = {
  forCreateData: <T extends TNginxTemplatesCreatePayload>(p: T) => p as T,
};
