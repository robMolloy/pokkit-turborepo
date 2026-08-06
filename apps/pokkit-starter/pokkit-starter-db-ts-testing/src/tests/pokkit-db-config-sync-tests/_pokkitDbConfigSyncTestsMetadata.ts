export const pokkitDbConfigSyncTestsMetadata = {
  collectionFileValid: { portNumber: 8200, name: "pokkitDbConfigSyncValidCollectionFileTests" },
  collectionFileInvalid: { portNumber: 8201, name: "pokkitDbConfigSyncCollectionFileInvalidTests" },
  collectionFileMissing: { portNumber: 8202, name: "pokkitDbConfigSyncCollectionFileMissingTests" },
  secretFileValid: { portNumber: 8203, name: "pokkitDbConfigSyncSecretFileValidTests" },
  secretFileInvalid: { portNumber: 8204, name: "pokkitDbConfigSyncSecretFileInvalidTests" },
  secretFileMissing: { portNumber: 8205, name: "pokkitDbConfigSyncSecretFileMissingTests" },
  settingsFileValid: { portNumber: 8206, name: "pokkitDbConfigSyncSettingsFileValidTests" },
  settingsFileInvalid: { portNumber: 8207, name: "pokkitDbConfigSyncSettingsFileInvalidTests" },
  settingsFileMissing: { portNumber: 8208, name: "pokkitDbConfigSyncSettingsFileMissingTests" },
} as const satisfies { [k: string]: { portNumber: number; name: string } };
