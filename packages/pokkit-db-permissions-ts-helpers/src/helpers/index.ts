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
const organisationsPayloadBuilderInit = {
  forCreateData: <T extends TOrganisationsCreatePayload>(p: T) =>
    ({ name: p.name, description: p.description }) as T,
};
export const organisationsPayloadBuilder = {
  ...organisationsPayloadBuilderInit,
  forCreateRandomData: () => {
    const randomNumber = Math.floor(Math.random() * 1000000000000000000);
    return organisationsPayloadBuilderInit.forCreateData({
      name: `Org ${randomNumber}`,
      description: `Desc ${randomNumber}`,
    });
  },
};
export type TOrganisationUserPermissionsRole = "admin" | "standard";
export type TOrganisationUserPermissionsStatus = "approved" | "pending" | "blocked";
export type TOrganisationsUserPermissionsCreatePayload = {
  orgId: string;
  userId: string;
  role: TOrganisationUserPermissionsRole;
  status: TOrganisationUserPermissionsStatus;
};
export const organisationsUserPermissionsPayloadBuilder = {
  forCreateData: <T extends TOrganisationsUserPermissionsCreatePayload>(p: T) =>
    ({
      orgId: p.orgId,
      userId: p.userId,
      role: p.role,
      status: p.status,
    }) as T,
};
