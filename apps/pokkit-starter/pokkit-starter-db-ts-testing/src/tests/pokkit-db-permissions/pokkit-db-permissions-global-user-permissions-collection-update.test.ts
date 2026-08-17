import {
  getPbFilePath,
  getPbServeUrl,
  killPbInstance,
  servePb,
  superusersCollectionName,
  truncatePbCollections,
  upsertPbAdminCredentialsFromCli,
} from "@repo/pokkit-testing";
import fse from "fs-extra";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PocketBase } from "../../config/pocketbaseConfig";
import { userPayloadBuilder } from "@repo/pokkit-db-permissions-ts-helpers";
import { sourceTestBuildDirPath, superuserEmail, superuserPassword } from "../_constants";
import { pokkitDbPermissionsTestsMetadata } from "./_pokkitDbConfigSyncTestsMetadata";
import {
  usersCollectionName,
  globalUserPermissionsCollectionName,
  globalUserPermissionsPayloadBuilder,
} from "@repo/pokkit-db-permissions-ts-helpers";

const testMetadata =
  pokkitDbPermissionsTestsMetadata.pokkitDbPermissionsGlobalUserPermissionsCollectionUpdate;
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

  it("PDBP-GUP-UPDATE-01 — Global Superadmin can UPDATE", async () => {
    const superadminUserPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminUserPb.collection(usersCollectionName).create(superadminUserPayload);
    await superadminUserPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    await superadminUserPb.collection(globalUserPermissionsCollectionName).getFullList();

    const testUserPb = createPbConnection();
    const testUserPayload = userPayloadBuilder.forCreateRandomData();
    const testUserRecord = await testUserPb.collection(usersCollectionName).create(testUserPayload);
    await testUserPb
      .collection(usersCollectionName)
      .authWithPassword(testUserPayload.email, testUserPayload.password);

    const testGlobalUserPermissionsPayload1 = globalUserPermissionsPayloadBuilder.forCreateData({
      userId: testUserRecord.id,
      role: "standard",
      status: "pending",
    });
    const testGlobalUserPermissionsPayload2 = globalUserPermissionsPayloadBuilder.forCreateData({
      userId: testUserRecord.id,
      role: "admin",
      status: "approved",
    });
    const testGlobalUserPermissionsRecord1 = await superadminUserPb
      .collection(globalUserPermissionsCollectionName)
      .create(testGlobalUserPermissionsPayload1);
    expect(testGlobalUserPermissionsRecord1).toMatchObject(testGlobalUserPermissionsPayload1);

    const testGlobalUserPermissionsRecord2 = await superadminUserPb
      .collection(globalUserPermissionsCollectionName)
      .update(testGlobalUserPermissionsRecord1.id, testGlobalUserPermissionsPayload2);
    expect(testGlobalUserPermissionsRecord2).toMatchObject(testGlobalUserPermissionsPayload2);
  });

  it("PDBP-GUP-UPDATE-02 — Global Admin cannot UPDATE", async () => {
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
    await superadminUserPb
      .collection(globalUserPermissionsCollectionName)
      .create(adminGlobalUserPermissionsPayload);

    const testUserPb = createPbConnection();
    const testUserPayload = userPayloadBuilder.forCreateRandomData();
    const testUserRecord = await testUserPb.collection(usersCollectionName).create(testUserPayload);
    await testUserPb
      .collection(usersCollectionName)
      .authWithPassword(testUserPayload.email, testUserPayload.password);

    const testGlobalUserPermissionsPayload = globalUserPermissionsPayloadBuilder.forCreateData({
      userId: testUserRecord.id,
      role: "standard",
      status: "pending",
    });
    const testGlobalUserPermissionsRecord = await superadminUserPb
      .collection(globalUserPermissionsCollectionName)
      .create(testGlobalUserPermissionsPayload);
    expect(testGlobalUserPermissionsRecord).toMatchObject(testGlobalUserPermissionsPayload);

    await expect(
      adminUserPb
        .collection(globalUserPermissionsCollectionName)
        .update(testGlobalUserPermissionsRecord.id, testGlobalUserPermissionsPayload),
    ).rejects.toThrow();
  });

  it("PDBP-GUP-UPDATE-03 — Global Standard cannot UPDATE", async () => {
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
    await superadminUserPb
      .collection(globalUserPermissionsCollectionName)
      .create(standardGlobalUserPermissionsPayload);

    const testUserPb = createPbConnection();
    const testUserPayload = userPayloadBuilder.forCreateRandomData();
    const testUserRecord = await testUserPb.collection(usersCollectionName).create(testUserPayload);
    await testUserPb
      .collection(usersCollectionName)
      .authWithPassword(testUserPayload.email, testUserPayload.password);

    const testGlobalUserPermissionsPayload = globalUserPermissionsPayloadBuilder.forCreateData({
      userId: testUserRecord.id,
      role: "standard",
      status: "pending",
    });
    const testGlobalUserPermissionsRecord = await superadminUserPb
      .collection(globalUserPermissionsCollectionName)
      .create(testGlobalUserPermissionsPayload);
    expect(testGlobalUserPermissionsRecord).toMatchObject(testGlobalUserPermissionsPayload);

    await expect(
      standardUserPb
        .collection(globalUserPermissionsCollectionName)
        .update(testGlobalUserPermissionsRecord.id, testGlobalUserPermissionsPayload),
    ).rejects.toThrow();
  });
});
