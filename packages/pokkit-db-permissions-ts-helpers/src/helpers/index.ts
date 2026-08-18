import PocketBase from "pocketbase";

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

export type TUserPayloadCreateData = {
  email: string;
  password: string;
  passwordConfirm: string;
};

const createRandomEmailAddress = () => `test${Math.floor(Math.random() * 10000000)}@example.com`;

function createRandomUserEmailPasswordData(): TUserPayloadCreateData {
  const email = createRandomEmailAddress();
  return { email, password: email, passwordConfirm: email };
}

const userPayloadBuilderInit = {
  forCreateData: <T extends TUserPayloadCreateData>(p: T) =>
    ({
      email: p.email,
      password: p.password,
      passwordConfirm: p.passwordConfirm,
    }) as T,
};

export const userPayloadBuilder = {
  ...userPayloadBuilderInit,
  forCreateRandomData: () =>
    userPayloadBuilderInit.forCreateData(createRandomUserEmailPasswordData()),
};

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
export type TOrganisationUserPermissionsCreatePayload = {
  orgId: string;
  userId: string;
  role: TOrganisationUserPermissionsRole;
  status: TOrganisationUserPermissionsStatus;
};
export const organisationUserPermissionsPayloadBuilder = {
  forCreateData: <T extends TOrganisationUserPermissionsCreatePayload>(p: T) =>
    ({
      orgId: p.orgId,
      userId: p.userId,
      role: p.role,
      status: p.status,
    }) as T,
};

export const createUserAndPermissions = async (p: {
  user: { toBeActionedByPb: PocketBase; payload: TUserPayloadCreateData };
  globalUserPermissions?: {
    toBeActionedByPb: PocketBase;
    payload: Omit<TGlobalUserPermissionsCreatePayload, "userId">;
  };
  organisationUserPermissions?: {
    toBeActionedByPb: PocketBase;
    payload: Omit<TOrganisationUserPermissionsCreatePayload, "userId">;
  }[];
}) => {
  const userRecord = await p.user.toBeActionedByPb
    .collection(usersCollectionName)
    .create(p.user.payload);
  await p.user.toBeActionedByPb
    .collection(usersCollectionName)
    .authWithPassword(p.user.payload.email, p.user.payload.password);

  const globalUserPermissionsRecord = await (() => {
    if (!p.globalUserPermissions) return undefined;
    return p.globalUserPermissions.toBeActionedByPb
      .collection(globalUserPermissionsCollectionName)
      .create(
        globalUserPermissionsPayloadBuilder.forCreateData({
          ...p.globalUserPermissions.payload,
          userId: userRecord.id,
        }),
      );
  })();

  const organisationUserPermissionsRecordsPrmosises = (() => {
    if (!p.organisationUserPermissions) return undefined;
    return p.organisationUserPermissions.map((x) => {
      const payload = { ...x.payload, userId: userRecord.id };
      return x.toBeActionedByPb
        .collection(organisationUserPermissionsCollectionName)
        .create(organisationUserPermissionsPayloadBuilder.forCreateData(payload));
    });
  })();

  const organisationUserPermissionsRecords = organisationUserPermissionsRecordsPrmosises
    ? await Promise.all(organisationUserPermissionsRecordsPrmosises)
    : [];

  return { userRecord, globalUserPermissionsRecord, organisationUserPermissionsRecords };
};
