export const pokkitDbPermissionsTestsMetadata = {
  usersCollectionCreateAction: {
    portNumber: 8300,
    name: "pokkitDbPermissionsUsersCollectionCreateActionTests",
  },
} as const satisfies { [k: string]: { portNumber: number; name: string } };
