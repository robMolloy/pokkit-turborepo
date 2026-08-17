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
import { sourceTestBuildDirPath, superuserEmail, superuserPassword } from "../_constants";
import { pokkitDbPermissionsTestsMetadata } from "./_pokkitDbConfigSyncTestsMetadata";
import { userPayloadBuilder } from "@repo/pokkit-db-permissions-ts-helpers";
import {
  globalUserPermissionsCollectionName,
  globalUserPermissionsPayloadBuilder,
} from "@repo/pokkit-db-permissions-ts-helpers";

const testMetadata =
  pokkitDbPermissionsTestsMetadata.pokkitDbPermissionsGlobalUserPermissionsCollectionDeleteOwn;
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

  it("PDBP-GUP-DELETE-OWN-01 — Global Superadmin cannot DELETE OWN", async () => {
    const superadminUserPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    const superadminUserRecord = await superadminUserPb
      .collection(usersCollectionName)
      .create(superadminUserPayload);
    await superadminUserPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    await expect(
      superadminUserPb
        .collection(globalUserPermissionsCollectionName)
        .delete(superadminUserRecord.id),
    ).rejects.toThrow();
  });

  it("PDBP-GUP-DELETE-OWN-02 — Global Admin (approved) can DELETE OWN", async () => {
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
    const adminGlobalUserPermissionsRecord = await superadminUserPb
      .collection(globalUserPermissionsCollectionName)
      .create(adminGlobalUserPermissionsPayload);

    const deleteResp = await adminUserPb
      .collection(globalUserPermissionsCollectionName)
      .delete(adminGlobalUserPermissionsRecord.id);
    expect(deleteResp).toBe(true);
  });

  it("PDBP-GUP-DELETE-OWN-03 — Global Admin (pending or blocked) cannot DELETE OWN", async () => {
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

    const pendingAdminGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: pendingAdminUserRecord.id,
        role: "admin",
        status: "pending",
      });
    const pendingAdminGlobalUserPermissionsRecord = await superadminUserPb
      .collection(globalUserPermissionsCollectionName)
      .create(pendingAdminGlobalUserPermissionsPayload);

    await expect(
      pendingAdminUserPb
        .collection(globalUserPermissionsCollectionName)
        .delete(pendingAdminGlobalUserPermissionsRecord.id),
    ).rejects.toThrow();

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
    const blockedAdminGlobalUserPermissionsRecord = await superadminUserPb
      .collection(globalUserPermissionsCollectionName)
      .create(blockedAdminGlobalUserPermissionsPayload);

    await expect(
      blockedAdminUserPb
        .collection(globalUserPermissionsCollectionName)
        .delete(blockedAdminGlobalUserPermissionsRecord.id),
    ).rejects.toThrow();
  });

  it("PDBP-GUP-DELETE-OWN-04 — Global Standard (approved) can DELETE OWN", async () => {
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
    const standardGlobalUserPermissionsRecord = await superadminUserPb
      .collection(globalUserPermissionsCollectionName)
      .create(standardGlobalUserPermissionsPayload);

    const deleteResp = await standardUserPb
      .collection(globalUserPermissionsCollectionName)
      .delete(standardGlobalUserPermissionsRecord.id);

    expect(deleteResp).toBe(true);
  });

  it("PDBP-GUP-DELETE-OWN-05 — Global Standard (pending or blocked) cannot DELETE OWN", async () => {
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

    const pendingStandardGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: pendingStandardUserRecord.id,
        role: "standard",
        status: "pending",
      });
    const pendingStandardGlobalUserPermissionsRecord = await superadminUserPb
      .collection(globalUserPermissionsCollectionName)
      .create(pendingStandardGlobalUserPermissionsPayload);

    await expect(
      pendingStandardUserPb
        .collection(globalUserPermissionsCollectionName)
        .delete(pendingStandardGlobalUserPermissionsRecord.id),
    ).rejects.toThrow();

    const blockedStandardUserPb = createPbConnection();
    const blockedStandardUserPayload = userPayloadBuilder.forCreateRandomData();
    const blockedStandardUserRecord = await blockedStandardUserPb
      .collection(usersCollectionName)
      .create(blockedStandardUserPayload);
    await blockedStandardUserPb
      .collection(usersCollectionName)
      .authWithPassword(blockedStandardUserPayload.email, blockedStandardUserPayload.password);

    const blockedStandardGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: blockedStandardUserRecord.id,
        role: "standard",
        status: "blocked",
      });
    const blockedStandardGlobalUserPermissionsRecord = await superadminUserPb
      .collection(globalUserPermissionsCollectionName)
      .create(blockedStandardGlobalUserPermissionsPayload);

    await expect(
      blockedStandardUserPb
        .collection(globalUserPermissionsCollectionName)
        .delete(blockedStandardGlobalUserPermissionsRecord.id),
    ).rejects.toThrow();
  });
});
