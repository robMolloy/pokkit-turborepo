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
