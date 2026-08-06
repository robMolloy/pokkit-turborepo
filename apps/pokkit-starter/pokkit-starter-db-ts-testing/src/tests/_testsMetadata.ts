export const testsMetadata = {
  pocketbaseViewLogs: { portNumber: 8119, name: "pocketbaseViewLogs" },
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

  pokkitDbPermissionsNoCollectionsFile: {
    portNumber: 8128,
    name: "pokkitDbPermissionsNoCollectionsFile",
  },
  pokkitDbPermissionsFirstUserIsSuperadmin: {
    portNumber: 8129,
    name: "pokkitDbPermissionsFirstUserIsSuperadmin",
  },
  pokkitDbViewLogs: { portNumber: 8130, name: "pokkitDbViewLogs" },
  pokkitDbPermissionsMergeAnyCrudActionIfStandardGlobalUserCollectionSchema: {
    portNumber: 8131,
    name: "pokkitDbPermissionsMergeAnyCrudActionIfStandardGlobalUserCollectionSchema",
  },
  pokkitDbPermissionsServeWithoutCollectionsFile: {
    portNumber: 8133,
    name: "pokkitDbPermissionsServeWithoutCollectionsFile",
  },
} as const satisfies { [k: string]: { portNumber: number; name: string } };
