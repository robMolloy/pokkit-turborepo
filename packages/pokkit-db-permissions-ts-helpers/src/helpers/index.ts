export const globalUserPermissionsCollectionName = "globalUserPermissions";
export const organisationsCollectionName = "organisations";
export const organisationsUserPermissionsCollectionName = "organisationsUsersPermissions";

export type TGlobalUserPermissionsRoles = "superadmin" | "admin" | "standard";
export type TGlobalUserPermissionsStatus = "approved" | "pending" | "blocked";

export const globalUserPermissionsPayloadBuilder = {
  forCreateData: (p: {
    userId: string;
    role: TGlobalUserPermissionsRoles;
    status: TGlobalUserPermissionsStatus;
  }) => ({
    userId: p.userId,
    role: p.role,
    status: p.status,
  }),
};
