export const pokkitDbDeploymentsTestsMetadata = {
  pokkitDbDeployments1: { portNumber: 8600, name: "pokkitDbDeployments1" },
} as const satisfies { [k: string]: { portNumber: number; name: string } };
