import {
  getPbFilePath,
  getPbServeUrl,
  killPbInstance,
  servePb,
  superusersCollectionName,
  truncatePbCollections,
  upsertPbAdminCredentialsFromCli,
  usersCollectionName,
} from "@repo/pokkit-testing";
import fse from "fs-extra";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PocketBase } from "../../config/pocketbaseConfig";
import { userPayloadBuilder } from "../../utils/pocketbaseUserHelpers";
import { sourceTestBuildDirPath, superuserEmail, superuserPassword } from "../_constants";
import { pokkitDbPermissionsTestsMetadata } from "./_pokkitDbConfigSyncTestsMetadata";
import { globalUserPermissionsPayloadBuilder } from "@repo/pokkit-db-permissions-ts-helpers";

const globalUserPermissionsCollectionName = "globalUserPermissions";

const testMetadata =
  pokkitDbPermissionsTestsMetadata.pokkitDbPermissionsGlobalUserPermissionsCollectionListOwn;
const testSuiteName = testMetadata.name;

const pbPortNumber = testMetadata.portNumber;
const pbDirPath = `_sandboxes/${testSuiteName}`;
const pbFilePath = getPbFilePath({ pbDirPath });
const pbServeUrl = getPbServeUrl({ pbPortNumber });
const logFilePath = `_logs/${testSuiteName}`;

const createPbConnection = () => new PocketBase(pbServeUrl);

describe(`${testSuiteName} tests`, () => {
  beforeAll(async () => {
    await killPbInstance({ pbPortNumber });
    fse.removeSync(pbDirPath);
    fse.copySync(sourceTestBuildDirPath, pbDirPath);

    await servePb({ pbFilePath, pbPortNumber, logFilePath });
    await upsertPbAdminCredentialsFromCli({ pbFilePath, superuserEmail, superuserPassword });
  });

  afterAll(async () => {
    killPbInstance({ pbPortNumber });
    fse.removeSync(pbDirPath);
  }, 30000);

  beforeEach(async () => {
    await truncatePbCollections({
      pbPortNumber,
      superuserEmail,
      superuserPassword,
      ignoreCollections: [superusersCollectionName],
    });
  });

  it("is connection healthy", async () => {
    const pb = createPbConnection();
    const isHealthy = await pb.health.check();
    expect(isHealthy.code).toBe(200);
  });

  it("PDBP-GUP-LIST-OWN-01 — Global Superadmin can LIST OWN", async () => {
    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);

    const superadminUserPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminUserPb.collection(usersCollectionName).create(superadminUserPayload);
    await superadminUserPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    const superadminUserGlobalUserPermissionsList = await superadminUserPb
      .collection(globalUserPermissionsCollectionName)
      .getFullList();
    expect(superadminUserGlobalUserPermissionsList.length).toBe(1);
  });

  it("PDBP-GUP-LIST-OWN-02 — Global Admin (approved) can LIST OWN", async () => {
    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);

    const superadminUserPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminUserPb.collection(usersCollectionName).create(superadminUserPayload);
    await superadminUserPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    const adminUserPb = createPbConnection();
    const adminUserPayload = userPayloadBuilder.forCreateRandomData();
    const adminUserRecord = await adminUserPb
      .collection(usersCollectionName)
      .create(adminUserPayload);
    await adminUserPb
      .collection(usersCollectionName)
      .authWithPassword(adminUserPayload.email, adminUserPayload.password);

    const adminGlobalUserPermissionsPayload = globalUserPermissionsPayloadBuilder.forCreateData({
      userId: adminUserRecord.id,
      role: "admin",
      status: "approved",
    });
    await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .create(adminGlobalUserPermissionsPayload);

    const adminUserGlobalUserPermissionsList = await adminUserPb
      .collection(globalUserPermissionsCollectionName)
      .getFullList({ filter: `userId = "${adminUserRecord.id}"` });
    expect(adminUserGlobalUserPermissionsList.length).toBe(1);
  });

  it("PDBP-USERS-LIST-OWN-03 — Global Admin (pending or blocked) can LIST only OWN", async () => {
    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);

    const superadminUserPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminUserPb.collection(usersCollectionName).create(superadminUserPayload);
    await superadminUserPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    const pendingAdminUserPb = createPbConnection();
    const pendingAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const pendingAdminUserRecord = await pendingAdminUserPb
      .collection(usersCollectionName)
      .create(pendingAdminUserPayload);
    await pendingAdminUserPb
      .collection(usersCollectionName)
      .authWithPassword(pendingAdminUserPayload.email, pendingAdminUserPayload.password);

    const blockedAdminUserPb = createPbConnection();
    const blockedAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const blockedAdminUserRecord = await blockedAdminUserPb
      .collection(usersCollectionName)
      .create(blockedAdminUserPayload);
    await blockedAdminUserPb
      .collection(usersCollectionName)
      .authWithPassword(blockedAdminUserPayload.email, blockedAdminUserPayload.password);

    const pendingAdminGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: pendingAdminUserRecord.id,
        role: "admin",
        status: "pending",
      });
    const blockedAdminGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: blockedAdminUserRecord.id,
        role: "admin",
        status: "blocked",
      });
    await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .create(pendingAdminGlobalUserPermissionsPayload);
    await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .create(blockedAdminGlobalUserPermissionsPayload);

    const pendingAdminUserGlobalUserPermissionsList = await pendingAdminUserPb
      .collection(globalUserPermissionsCollectionName)
      .getFullList();
    expect(pendingAdminUserGlobalUserPermissionsList.length).toBe(1);

    const blockedAdminUserGlobalUserPermissionsList = await blockedAdminUserPb
      .collection(globalUserPermissionsCollectionName)
      .getFullList();
    expect(blockedAdminUserGlobalUserPermissionsList.length).toBe(1);
  });
});
