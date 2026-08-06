export const pokkitDbConfigSyncTestsMetadata = {
  collectionFileValid: { portNumber: 8200, name: "pokkitDbConfigSyncValidCollectionFileTests" },
  collectionFileInvalid: { portNumber: 8201, name: "pokkitDbConfigSyncCollectionFileInvalidTests" },
  collectionFileMissing: { portNumber: 8202, name: "pokkitDbConfigSyncCollectionFileMissingTests" },
  settingsFileValid: { portNumber: 8203, name: "pokkitDbConfigSyncSettingsFileValidTests" },
  settingsFileInvalid: { portNumber: 8204, name: "pokkitDbConfigSyncSettingsFileInvalidTests" },
  settingsFileMissing: { portNumber: 8205, name: "pokkitDbConfigSyncSettingsFileMissingTests" },
} as const satisfies { [k: string]: { portNumber: number; name: string } };
