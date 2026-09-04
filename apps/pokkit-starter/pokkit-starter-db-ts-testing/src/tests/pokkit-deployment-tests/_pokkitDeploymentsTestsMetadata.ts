export const pokkitDbDeploymentsTestsMetadata = {
  pokkitDeploymentsPokkitDb: { portNumber: 8600, name: "pokkitDeploymentsPokkitDb" },
  pokkitDeploymentsViteDb: { portNumber: 8601, name: "pokkitDeploymentsViteDb" },
} as const satisfies { [k: string]: { portNumber: number; name: string } };
