export const getPokkitDbSettingsFilePath = (p: { pbDirPath: string }) =>
  p.pbDirPath + "/pb_config/settings.json";

export const getPokkitDbCollectionsFilePathh = (p: { pbDirPath: string }) =>
  p.pbDirPath + "/pb_config/collections.json";

export const getPokkitDbSecretsFilePath = (p: { pbDirPath: string }) =>
  p.pbDirPath + "/pb_config/secrets.json";
