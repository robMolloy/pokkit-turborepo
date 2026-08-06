export const pokkitDbConfigSyncTestsMetadata = {
  validCollectionFile: { portNumber: 8200, name: "pokkitDbConfigSyncValidCollectionFileTests" },
  invalidCollectionFile: { portNumber: 8201, name: "pokkitDbConfigSyncInvalidCollectionFileTests" },
} as const satisfies { [k: string]: { portNumber: number; name: string } };
