export const pokkitDbConfigSyncTestsMetadata = {
  validCollectionFile: { portNumber: 8200, name: "pokkitDbConfigSyncValidCollectionFile" },
  invalidCollectionFile: { portNumber: 8201, name: "pokkitDbConfigSyncInvalidCollectionFile" },
} as const satisfies { [k: string]: { portNumber: number; name: string } };
