export const testsMetadata = {
  pocketbaseStandardUser: { portNumber: 8120, name: "pocketbaseStandardUser" },
  pokkitDbConfigSyncCollection: { portNumber: 8121, name: "pokkitDbConfigSyncCollection" },
  pokkitDbConfigSyncSecretsNoFile: { portNumber: 8122, name: "pokkitDbConfigSyncSecretsNoFile" },
  pokkitDbConfigSyncSecrets: { portNumber: 8132, name: "pokkitDbConfigSyncSecrets" },

  pokkitDbConfigSyncSettingsCustomFile: {
    portNumber: 8124,
    name: "pokkitDbConfigSyncSettingsCustomFile",
  },
  pokkitDbConfigSyncSettingsErrorFile: {
    portNumber: 8125,
    name: "pokkitDbConfigSyncSettingsErrorFile",
  },
  pokkitDbConfigSyncSettingsNoFile: { portNumber: 8126, name: "pokkitDbConfigSyncSettingsNoFile" },
  pokkitDbConfigSyncSettings: { portNumber: 8127, name: "pokkitDbConfigSyncSettings" },
} as const satisfies { [k: string]: { portNumber: number; name: string } };
