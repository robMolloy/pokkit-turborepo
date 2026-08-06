export const pokkitDbConfigSyncTestsMetadata = {
  validCollectionFile: { portNumber: 8200, name: "pokkitDbConfigSyncValidCollectionFileTests" },
  invalidCollectionFile: { portNumber: 8201, name: "pokkitDbConfigSyncInvalidCollectionFileTests" },
  missingCollectionFile: { portNumber: 8202, name: "pokkitDbConfigSyncMissingCollectionFileTests" },
} as const satisfies { [k: string]: { portNumber: number; name: string } };
