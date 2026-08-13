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
  pokkitDbPermissionsTestsMetadata.pokkitDbPermissionsGlobalUserPermissionsCollectionViewOwn;
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

  it("PDBP-GUP-VIEW-OWN-01 — Global Superadmin can VIEW OWN", async () => {
    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);

    const superadminUserPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    const superadminUserRecord = await superadminUserPb
      .collection(usersCollectionName)
      .create(superadminUserPayload);
    await superadminUserPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    // no need to add this as first user is auto-elevated to superadmin
    const superadminGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: superadminUserRecord.id,
        role: "superadmin",
        status: "approved",
      });

    const globalUserPermissionsFullList = await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .getFullList();
    expect(globalUserPermissionsFullList.length).toBe(1);

    const superadminGlobalUserPermissionsRecord = globalUserPermissionsFullList.find(
      (record) => record.userId === superadminUserRecord.id,
    );
    if (!superadminGlobalUserPermissionsRecord)
      return expect(superadminGlobalUserPermissionsRecord).toBeTruthy();

    const superadminGlobalUserPermissionsRecordTest = await superadminUserPb
      .collection(globalUserPermissionsCollectionName)
      .getOne(superadminGlobalUserPermissionsRecord.id);
    expect(superadminGlobalUserPermissionsRecordTest).toMatchObject(
      superadminGlobalUserPermissionsPayload,
    );
  });

  it("PDBP-GUP-VIEW-OWN-02 — Global Admin (approved) can VIEW OWN", async () => {
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

    const globalUserPermissionsFullList = await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .getFullList();
    expect(globalUserPermissionsFullList.length).toBe(2);

    const adminGlobalUserPermissionsRecord = globalUserPermissionsFullList.find(
      (record) => record.userId === adminUserRecord.id,
    );
    if (!adminGlobalUserPermissionsRecord)
      return expect(adminGlobalUserPermissionsRecord).toBeTruthy();

    const adminGlobalUserPermissionsRecordTest = await adminUserPb
      .collection(globalUserPermissionsCollectionName)
      .getOne(adminGlobalUserPermissionsRecord.id);
    expect(adminGlobalUserPermissionsRecordTest).toMatchObject(adminGlobalUserPermissionsPayload);
  });

  it("PDBP-USERS-VIEW-OWN-03 — Global Admin (pending or blocked) can VIEW only OWN", async () => {
    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);

    const superadminUserPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    const superadminUserRecord = await superadminUserPb
      .collection(usersCollectionName)
      .create(superadminUserPayload);
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

    const globalUserPermissionsFullList = await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .getFullList();
    expect(globalUserPermissionsFullList.length).toBe(3);

    const superadminGlobalUserPermissionsRecord = globalUserPermissionsFullList.find(
      (record) => record.userId === superadminUserRecord.id,
    );
    if (!superadminGlobalUserPermissionsRecord)
      return expect(superadminGlobalUserPermissionsRecord).toBeTruthy();

    await expect(
      pendingAdminUserPb
        .collection(globalUserPermissionsCollectionName)
        .getOne(superadminGlobalUserPermissionsRecord.id),
    ).rejects.toThrow();

    expect(
      await pendingAdminUserPb
        .collection(globalUserPermissionsCollectionName)
        .getOne(pendingAdminGlobalUserPermissionsRecord.id),
    ).toMatchObject(pendingAdminGlobalUserPermissionsPayload);

    await expect(
      pendingAdminUserPb
        .collection(globalUserPermissionsCollectionName)
        .getOne(superadminGlobalUserPermissionsRecord.id),
    ).rejects.toThrow();

    expect(
      await blockedAdminUserPb
        .collection(globalUserPermissionsCollectionName)
        .getOne(blockedAdminGlobalUserPermissionsRecord.id),
    ).toMatchObject(blockedAdminGlobalUserPermissionsPayload);
  });

  it("PDBP-GUP-VIEW-OWN-04 — Global Standard (approved) can VIEW OWN", async () => {
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

    const globalUserPermissionsFullList = await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .getFullList();
    expect(globalUserPermissionsFullList.length).toBe(2);

    const standardGlobalUserPermissionsRecord = globalUserPermissionsFullList.find(
      (record) => record.userId === standardUserRecord.id,
    );
    if (!standardGlobalUserPermissionsRecord)
      return expect(standardGlobalUserPermissionsRecord).toBeTruthy();

    const standardGlobalUserPermissionsRecordTest = await standardUserPb
      .collection(globalUserPermissionsCollectionName)
      .getOne(standardGlobalUserPermissionsRecord.id);
    expect(standardGlobalUserPermissionsRecordTest).toMatchObject(
      standardGlobalUserPermissionsPayload,
    );
  });

  it("PDBP-USERS-VIEW-OWN-05 — Global Standard (pending or blocked) can VIEW only OWN", async () => {
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
    const pendingStandardGlobalUserPermissionsRecord = await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .create(pendingStandardGlobalUserPermissionsPayload);
    const blockedStandardGlobalUserPermissionsRecord = await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .create(blockedStandardGlobalUserPermissionsPayload);

    const globalUserPermissionsFullList = await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .getFullList();
    expect(globalUserPermissionsFullList.length).toBe(3);

    await expect(
      await pendingStandardUserPb
        .collection(globalUserPermissionsCollectionName)
        .getOne(pendingStandardGlobalUserPermissionsRecord.id),
    ).toMatchObject(pendingStandardGlobalUserPermissionsPayload);

    await expect(
      pendingStandardUserPb
        .collection(globalUserPermissionsCollectionName)
        .getOne(blockedStandardGlobalUserPermissionsRecord.id),
    ).rejects.toThrow();

    await expect(
      await blockedStandardUserPb
        .collection(globalUserPermissionsCollectionName)
        .getOne(blockedStandardGlobalUserPermissionsRecord.id),
    ).toMatchObject(blockedStandardGlobalUserPermissionsPayload);
    await expect(
      blockedStandardUserPb
        .collection(globalUserPermissionsCollectionName)
        .getOne(pendingStandardGlobalUserPermissionsRecord.id),
    ).rejects.toThrow();
  });
});
