export const usersCollectionName = "users";
export const globalUserPermissionsCollectionName = "globalUserPermissions";
export const organisationsCollectionName = "organisations";
export const organisationUserPermissionsCollectionName = "organisationUserPermissions";
export const pokkitDbPermissionsCollectionNames = [
  usersCollectionName,
  globalUserPermissionsCollectionName,
  organisationUserPermissionsCollectionName,
  organisationsCollectionName,
];

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
export type TOrganisationsCreatePayload = {
  name: string;
  description: string;
};
export const organisationsPayloadBuilder = {
  forCreateData: <T extends TOrganisationsCreatePayload>(p: T) =>
    ({ name: p.name, description: p.description }) as T,
};

export type TOrganisationUserPermissionsRole = "admin" | "standard";
export type TOrganisationUserPermissionsStatus = "approved" | "pending" | "blocked";
export type TOrganisationsUserPermissionsCreatePayload = {
  organisationId: string;
  userId: string;
  role: TOrganisationUserPermissionsRole;
  status: TOrganisationUserPermissionsStatus;
};
export const organisationsUserPermissionsPayloadBuilder = {
  forCreateData: <T extends TOrganisationsUserPermissionsCreatePayload>(p: T) =>
    ({
      organisationId: p.organisationId,
      userId: p.userId,
      role: p.role,
      status: p.status,
    }) as T,
};
