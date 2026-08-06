export const pokkitDbConfigSyncTestsMetadata = {
  collectionFileValid: { portNumber: 8200, name: "pokkitDbConfigSyncValidCollectionFileTests" },
  collectionFileInvalid: { portNumber: 8201, name: "pokkitDbConfigSyncCollectionFileInvalidTests" },
  collectionFileMissing: { portNumber: 8202, name: "pokkitDbConfigSyncCollectionFileMissingTests" },
} as const satisfies { [k: string]: { portNumber: number; name: string } };
