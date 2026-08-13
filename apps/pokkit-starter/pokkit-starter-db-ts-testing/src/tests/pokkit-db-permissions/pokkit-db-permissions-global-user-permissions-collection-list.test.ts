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
import {
  globalUserPermissionsCollectionName,
  globalUserPermissionsPayloadBuilder,
} from "@repo/pokkit-db-permissions-ts-helpers";

const testMetadata =
  pokkitDbPermissionsTestsMetadata.pokkitDbPermissionsGlobalUserPermissionsCollectionList;
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

  it("PDBP-GUP-LIST-01 — Global Superadmin can LIST", async () => {
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

  it("PDBP-GUP-LIST-02 — Global Admin (approved) can LIST", async () => {
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
      .getFullList();
    expect(adminUserGlobalUserPermissionsList.length).toBe(2);
  });

  it("PDBP-GUP-LIST-03 — Global Admin (pending or blocked) cannot LIST", async () => {
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
    const pendingAdminGlobalUserPermissionsRecord = await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .create(pendingAdminGlobalUserPermissionsPayload);
    const blockedAdminGlobalUserPermissionsRecord = await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .create(blockedAdminGlobalUserPermissionsPayload);

    const pendingAdminUserGlobalUserPermissionsList = await pendingAdminUserPb
      .collection(globalUserPermissionsCollectionName)
      .getFullList();
    expect(pendingAdminUserGlobalUserPermissionsList.length).toBe(1);
    expect(pendingAdminUserGlobalUserPermissionsList[0]).toMatchObject(
      pendingAdminGlobalUserPermissionsRecord,
    );
    const blockedAdminUserGlobalUserPermissionsList = await blockedAdminUserPb
      .collection(globalUserPermissionsCollectionName)
      .getFullList();
    expect(blockedAdminUserGlobalUserPermissionsList.length).toBe(1);
    expect(blockedAdminUserGlobalUserPermissionsList[0]).toMatchObject(
      blockedAdminGlobalUserPermissionsRecord,
    );
  });

  it("PDBP-GUP-LIST-04 — Global Standard (approved) can LIST", async () => {
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

    const standardUserPb = createPbConnection();
    const standardUserPayload = userPayloadBuilder.forCreateRandomData();
    const standardUserRecord = await standardUserPb
      .collection(usersCollectionName)
      .create(standardUserPayload);
    await standardUserPb
      .collection(usersCollectionName)
      .authWithPassword(standardUserPayload.email, standardUserPayload.password);

    const standardGlobalUserPermissionsPayload = globalUserPermissionsPayloadBuilder.forCreateData({
      userId: standardUserRecord.id,
      role: "standard",
      status: "approved",
    });
    await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .create(standardGlobalUserPermissionsPayload);

    const standardUserGlobalUserPermissionsList = await standardUserPb
      .collection(globalUserPermissionsCollectionName)
      .getFullList();
    expect(standardUserGlobalUserPermissionsList.length).toBe(2);
  });

  it("PDBP-GUP-LIST-05 — Global Standard (pending or blocked) cannot LIST", async () => {
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

    const pendingStandardUserPb = createPbConnection();
    const pendingStandardUserPayload = userPayloadBuilder.forCreateRandomData();
    const pendingStandardUserRecord = await pendingStandardUserPb
      .collection(usersCollectionName)
      .create(pendingStandardUserPayload);
    await pendingStandardUserPb
      .collection(usersCollectionName)
      .authWithPassword(pendingStandardUserPayload.email, pendingStandardUserPayload.password);

    const blockedStandardUserPb = createPbConnection();
    const blockedStandardUserPayload = userPayloadBuilder.forCreateRandomData();
    const blockedStandardUserRecord = await blockedStandardUserPb
      .collection(usersCollectionName)
      .create(blockedStandardUserPayload);
    await blockedStandardUserPb
      .collection(usersCollectionName)
      .authWithPassword(blockedStandardUserPayload.email, blockedStandardUserPayload.password);

    const pendingStandardGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: pendingStandardUserRecord.id,
        role: "standard",
        status: "pending",
      });
    const blockedStandardGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: blockedStandardUserRecord.id,
        role: "standard",
        status: "blocked",
      });
    await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .create(pendingStandardGlobalUserPermissionsPayload);
    await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .create(blockedStandardGlobalUserPermissionsPayload);

    const globalUserPermissionsFullList = await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .getFullList();
    expect(globalUserPermissionsFullList.length).toBe(3);

    const standardGlobalUserPermissionsRecord = globalUserPermissionsFullList.find(
      (record) => record.userId === pendingStandardUserRecord.id,
    );
    if (!standardGlobalUserPermissionsRecord)
      return expect(standardGlobalUserPermissionsRecord).toBeTruthy();

    const pendingStandardUserGlobalUserPermissionsList = await pendingStandardUserPb
      .collection(globalUserPermissionsCollectionName)
      .getFullList();
    expect(pendingStandardUserGlobalUserPermissionsList.length).toBe(1);
    const blockedStandardUserGlobalUserPermissionsList = await blockedStandardUserPb
      .collection(globalUserPermissionsCollectionName)
      .getFullList();
    expect(blockedStandardUserGlobalUserPermissionsList.length).toBe(1);
  });
});
