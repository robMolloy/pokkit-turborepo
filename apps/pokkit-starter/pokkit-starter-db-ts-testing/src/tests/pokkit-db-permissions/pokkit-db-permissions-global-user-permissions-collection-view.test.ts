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
import { userPayloadBuilder } from "@repo/pokkit-db-permissions-ts-helpers";
import { sourceTestBuildDirPath, superuserEmail, superuserPassword } from "../_constants";
import { pokkitDbPermissionsTestsMetadata } from "./_pokkitDbConfigSyncTestsMetadata";
import {
  globalUserPermissionsCollectionName,
  globalUserPermissionsPayloadBuilder,
} from "@repo/pokkit-db-permissions-ts-helpers";

const testMetadata =
  pokkitDbPermissionsTestsMetadata.pokkitDbPermissionsGlobalUserPermissionsCollectionView;
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

  it("PDBP-GUP-VIEW-01 — Global Superadmin can VIEW", async () => {
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

    const exampleUserPb = createPbConnection();
    const exampleUserPayload = userPayloadBuilder.forCreateRandomData();
    const exampleUserRecord = await exampleUserPb
      .collection(usersCollectionName)
      .create(exampleUserPayload);
    await exampleUserPb
      .collection(usersCollectionName)
      .authWithPassword(exampleUserPayload.email, exampleUserPayload.password);

    const exampleUserGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: exampleUserRecord.id,
        role: "admin",
        status: "approved",
      });
    await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .create(exampleUserGlobalUserPermissionsPayload);

    const globalUserPermissionsFullList = await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .getFullList();
    expect(globalUserPermissionsFullList.length).toBe(2);

    const superadminGlobalUserPermissionsRecord = globalUserPermissionsFullList.find(
      (record) => record.userId === superadminUserRecord.id,
    );
    const exampleUserGlobalUserPermissionsRecord = globalUserPermissionsFullList.find(
      (record) => record.userId === exampleUserRecord.id,
    );
    if (!superadminGlobalUserPermissionsRecord)
      return expect(superadminGlobalUserPermissionsRecord).toBeTruthy();
    if (!exampleUserGlobalUserPermissionsRecord)
      return expect(exampleUserGlobalUserPermissionsRecord).toBeTruthy();

    const globalUserPermissionsRecordTest = await superadminUserPb
      .collection(globalUserPermissionsCollectionName)
      .getOne(superadminGlobalUserPermissionsRecord.id);

    expect(globalUserPermissionsRecordTest).toMatchObject({
      userId: superadminUserRecord.id,
      status: "approved",
      role: "superadmin",
    });
    const exampleUserGlobalUserPermissionsRecordTest = await superadminUserPb
      .collection(globalUserPermissionsCollectionName)
      .getOne(exampleUserGlobalUserPermissionsRecord.id);

    expect(exampleUserGlobalUserPermissionsRecordTest).toMatchObject(
      exampleUserGlobalUserPermissionsPayload,
    );
  });

  it("PDBP-GUP-VIEW-02 — Global Admin (approved) can VIEW", async () => {
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

    const adminUserPb = createPbConnection();
    const adminUserPayload = userPayloadBuilder.forCreateRandomData();
    const adminUserRecord = await adminUserPb
      .collection(usersCollectionName)
      .create(adminUserPayload);
    await adminUserPb
      .collection(usersCollectionName)
      .authWithPassword(adminUserPayload.email, adminUserPayload.password);

    // no need to add this as first user is auto-elevated to superadmin
    const superadminGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: superadminUserRecord.id,
        role: "superadmin",
        status: "approved",
      });
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

    const superadminGlobalUserPermissionsRecord = globalUserPermissionsFullList.find(
      (record) => record.userId === superadminUserRecord.id,
    );
    if (!superadminGlobalUserPermissionsRecord)
      return expect(superadminGlobalUserPermissionsRecord).toBeTruthy();

    const adminGlobalUserPermissionsRecord = globalUserPermissionsFullList.find(
      (record) => record.userId === adminUserRecord.id,
    );
    if (!adminGlobalUserPermissionsRecord)
      return expect(adminGlobalUserPermissionsRecord).toBeTruthy();

    const superadminGlobalUserPermissionsRecordTest = await adminUserPb
      .collection(globalUserPermissionsCollectionName)
      .getOne(superadminGlobalUserPermissionsRecord.id);
    expect(superadminGlobalUserPermissionsRecordTest).toMatchObject(
      superadminGlobalUserPermissionsPayload,
    );

    const adminGlobalUserPermissionsRecordTest = await adminUserPb
      .collection(globalUserPermissionsCollectionName)
      .getOne(adminGlobalUserPermissionsRecord.id);
    expect(adminGlobalUserPermissionsRecordTest).toMatchObject(adminGlobalUserPermissionsPayload);
  });

  it("PDBP-GUP-VIEW-03 — Global Admin (pending or blocked) cannot VIEW", async () => {
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

    const pendingAdminGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: pendingAdminUserRecord.id,
        role: "admin",
        status: "pending",
      });
    const pendingAdminGlobalUserPermissionsRecord = await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .create(pendingAdminGlobalUserPermissionsPayload);

    const blockedAdminUserPb = createPbConnection();
    const blockedAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const blockedAdminUserRecord = await blockedAdminUserPb
      .collection(usersCollectionName)
      .create(blockedAdminUserPayload);
    await blockedAdminUserPb
      .collection(usersCollectionName)
      .authWithPassword(blockedAdminUserPayload.email, blockedAdminUserPayload.password);
    const blockedAdminGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: blockedAdminUserRecord.id,
        role: "admin",
        status: "blocked",
      });
    const blockedAdminGlobalUserPermissionsRecord = await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .create(blockedAdminGlobalUserPermissionsPayload);

    const globalUserPermissionsList = await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .getFullList({ filter: `userId = "${superadminUserRecord.id}"` });
    const superadminGlobalUserPermissionsRecord = globalUserPermissionsList[0];
    if (!superadminGlobalUserPermissionsRecord)
      return expect(superadminGlobalUserPermissionsRecord).toBeTruthy();
    expect(superadminGlobalUserPermissionsRecord).toMatchObject({ role: "superadmin" });

    await expect(
      pendingAdminUserPb
        .collection(globalUserPermissionsCollectionName)
        .getOne(superadminGlobalUserPermissionsRecord.id),
    ).rejects.toThrow();

    await expect(
      await pendingAdminUserPb
        .collection(globalUserPermissionsCollectionName)
        .getOne(pendingAdminGlobalUserPermissionsRecord.id),
    ).toMatchObject(pendingAdminGlobalUserPermissionsPayload);

    await expect(
      blockedAdminUserPb
        .collection(globalUserPermissionsCollectionName)
        .getOne(superadminGlobalUserPermissionsRecord.id),
    ).rejects.toThrow();

    await expect(
      await blockedAdminUserPb
        .collection(globalUserPermissionsCollectionName)
        .getOne(blockedAdminGlobalUserPermissionsRecord.id),
    ).toMatchObject(blockedAdminGlobalUserPermissionsPayload);
  });

  it("PDBP-GUP-VIEW-04 — Global Standard (approved) can VIEW", async () => {
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

    const standardUserPb = createPbConnection();
    const standardUserPayload = userPayloadBuilder.forCreateRandomData();
    const standardUserRecord = await standardUserPb
      .collection(usersCollectionName)
      .create(standardUserPayload);
    await standardUserPb
      .collection(usersCollectionName)
      .authWithPassword(standardUserPayload.email, standardUserPayload.password);

    // no need to add this as first user is auto-elevated to superadmin
    const superadminGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: superadminUserRecord.id,
        role: "superadmin",
        status: "approved",
      });
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

    const superadminGlobalUserPermissionsRecord = globalUserPermissionsFullList.find(
      (record) => record.userId === superadminUserRecord.id,
    );
    if (!superadminGlobalUserPermissionsRecord)
      return expect(superadminGlobalUserPermissionsRecord).toBeTruthy();

    const superadminGlobalUserPermissionsRecordTest = await standardUserPb
      .collection(globalUserPermissionsCollectionName)
      .getOne(superadminGlobalUserPermissionsRecord.id);
    expect(superadminGlobalUserPermissionsRecordTest).toMatchObject(
      superadminGlobalUserPermissionsPayload,
    );

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

  it("PDBP-GUP-VIEW-05 — Global Standard (pending or blocked) cannot VIEW", async () => {
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

    const pendingUserPb = createPbConnection();
    const pendingUserPayload = userPayloadBuilder.forCreateRandomData();
    const pendingUserRecord = await pendingUserPb
      .collection(usersCollectionName)
      .create(pendingUserPayload);
    await pendingUserPb
      .collection(usersCollectionName)
      .authWithPassword(pendingUserPayload.email, pendingUserPayload.password);

    const blockedUserPb = createPbConnection();
    const blockedUserPayload = userPayloadBuilder.forCreateRandomData();
    const blockedUserRecord = await blockedUserPb
      .collection(usersCollectionName)
      .create(blockedUserPayload);
    await blockedUserPb
      .collection(usersCollectionName)
      .authWithPassword(blockedUserPayload.email, blockedUserPayload.password);

    const pendingStandardGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: pendingUserRecord.id,
        role: "standard",
        status: "pending",
      });
    const blockedStandardGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: blockedUserRecord.id,
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

    const superadminGlobalUserPermissionsRecord = globalUserPermissionsFullList.find(
      (record) => record.userId === superadminUserRecord.id,
    );
    if (!superadminGlobalUserPermissionsRecord)
      return expect(superadminGlobalUserPermissionsRecord).toBeTruthy();

    await expect(
      pendingUserPb
        .collection(globalUserPermissionsCollectionName)
        .getOne(superadminGlobalUserPermissionsRecord.id),
    ).rejects.toThrow();

    await expect(
      blockedUserPb
        .collection(globalUserPermissionsCollectionName)
        .getOne(superadminGlobalUserPermissionsRecord.id),
    ).rejects.toThrow();
  });
});
