export const getPokkitDbSettingsFilePath = (p: { pbDirPath: string }) =>
  p.pbDirPath + "/pb_config/settings.json";

export const getPokkitDbCollectionsFilePath = (p: { pbDirPath: string }) =>
  p.pbDirPath + "/pb_config/collections.json";

export const getPokkitDbSecretsFilePath = (p: { pbDirPath: string }) =>
  p.pbDirPath + "/pb_config/secrets.json";

export const pbConfigSecretsCollectionName = "_pb_config_secrets";
