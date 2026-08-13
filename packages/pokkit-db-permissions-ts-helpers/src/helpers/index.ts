export const globalUserPermissionsCollectionName = "globalUserPermissions";
export const organisationsCollectionName = "organisations";
export const organisationsUserPermissionsCollectionName = "organisationsUsersPermissions";

export type TGlobalUserPermissionsRole = "superadmin" | "admin" | "standard";
export type TGlobalUserPermissionsStatus = "approved" | "pending" | "blocked";

export type TGlobalUserPermissionsCreatePayload = {
  userId: string;
  role: TGlobalUserPermissionsRole;
  status: TGlobalUserPermissionsStatus;
};

export const globalUserPermissionsPayloadBuilder = {
  forCreateData: <T extends TGlobalUserPermissionsCreatePayload>(p: T) =>
    ({ userId: p.userId, role: p.role, status: p.status }) as T,
};

// export type TOrganisationUserPermissionsRole = "admin" | "standard";
// export type TOrganisationUserPermissionsStatus = "approved" | "pending" | "blocked";

export type TOrganisationsCreatePayload = {
  name: string;
  description: string;
};

export const organisationsPayloadBuilder = {
  forCreateData: <T extends TOrganisationsCreatePayload>(p: T) =>
    ({ name: p.name, description: p.description }) as T,
};
