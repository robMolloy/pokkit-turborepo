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
import { sourceTestBuildDirPath, superuserEmail, superuserPassword } from "../_constants";
import { pokkitDbPermissionsTestsMetadata } from "./_pokkitDbConfigSyncTestsMetadata";
import { userPayloadBuilder } from "@repo/pokkit-db-permissions-ts-helpers";
import {
  globalUserPermissionsCollectionName,
  globalUserPermissionsPayloadBuilder,
  organisationsCollectionName,
  organisationsPayloadBuilder,
  organisationUserPermissionsCollectionName,
  organisationUserPermissionsPayloadBuilder,
  usersCollectionName,
} from "@repo/pokkit-db-permissions-ts-helpers";

const testMetadata =
  pokkitDbPermissionsTestsMetadata.pokkitDbPermissionsOrganisationUserPermissionsCollectionDelete;
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

  it("PDBP-OUP-DELETE-01 — Global Superadmin (approved) can DELETE", async () => {
    const superadminAndOrgAdminPb = createPbConnection();
    const superadminAndOrgAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const superadminAndOrgAdminUserRecord = await superadminAndOrgAdminPb
      .collection(usersCollectionName)
      .create(superadminAndOrgAdminUserPayload);
    await superadminAndOrgAdminPb
      .collection(usersCollectionName)
      .authWithPassword(
        superadminAndOrgAdminUserPayload.email,
        superadminAndOrgAdminUserPayload.password,
      );

    const organisationPayload = organisationsPayloadBuilder.forCreateRandomData();
    const organisationRecord = await superadminAndOrgAdminPb
      .collection(organisationsCollectionName)
      .create(organisationPayload);

    const superadminOnlyPb = createPbConnection();
    const superadminOnlyUserPayload = userPayloadBuilder.forCreateRandomData();
    const superadminOnlyUserRecord = await superadminOnlyPb
      .collection(usersCollectionName)
      .create(superadminOnlyUserPayload);
    await superadminOnlyPb
      .collection(usersCollectionName)
      .authWithPassword(superadminOnlyUserPayload.email, superadminOnlyUserPayload.password);

    const superadminOnlyGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: superadminOnlyUserRecord.id,
        role: "superadmin",
        status: "approved",
      });
    await superadminAndOrgAdminPb
      .collection(globalUserPermissionsCollectionName)
      .create(superadminOnlyGlobalUserPermissionsPayload);

    const organisationUserPermissionRecords = await superadminOnlyPb
      .collection(organisationUserPermissionsCollectionName)
      .getFullList();

    const superadminAndOrgAdminOrganisationUserPermissionRecord =
      organisationUserPermissionRecords.find(
        (record) =>
          record.userId === superadminAndOrgAdminUserRecord.id &&
          record.orgId === organisationRecord.id,
      );
    if (!superadminAndOrgAdminOrganisationUserPermissionRecord)
      return expect(superadminAndOrgAdminOrganisationUserPermissionRecord).toBeTruthy();

    await expect(
      superadminOnlyPb
        .collection(organisationUserPermissionsCollectionName)
        .delete(superadminAndOrgAdminOrganisationUserPermissionRecord.id),
    ).resolves.toBe(true);
  });

  it("PDBP-OUP-DELETE-02 — Global Superadmin (pending or blocked) cannot DELETE", async () => {
    const superadminAndOrgAdminPb = createPbConnection();
    const superadminAndOrgAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const superadminAndOrgAdminUserRecord = await superadminAndOrgAdminPb
      .collection(usersCollectionName)
      .create(superadminAndOrgAdminUserPayload);
    await superadminAndOrgAdminPb
      .collection(usersCollectionName)
      .authWithPassword(
        superadminAndOrgAdminUserPayload.email,
        superadminAndOrgAdminUserPayload.password,
      );

    const organisationPayload = organisationsPayloadBuilder.forCreateRandomData();
    const organisationRecord = await superadminAndOrgAdminPb
      .collection(organisationsCollectionName)
      .create(organisationPayload);

    const organisationUserPermissionRecords = await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .getFullList();

    const superadminAndOrgAdminOrganisationUserPermissionRecord =
      organisationUserPermissionRecords.find(
        (record) =>
          record.userId === superadminAndOrgAdminUserRecord.id &&
          record.orgId === organisationRecord.id,
      );

    if (!superadminAndOrgAdminOrganisationUserPermissionRecord)
      return expect(superadminAndOrgAdminOrganisationUserPermissionRecord).toBeTruthy();

    const pendingSuperadminPb = createPbConnection();
    const pendingSuperadminPayload = userPayloadBuilder.forCreateRandomData();
    const pendingSuperadminUserRecord = await pendingSuperadminPb
      .collection(usersCollectionName)
      .create(pendingSuperadminPayload);
    await pendingSuperadminPb
      .collection(usersCollectionName)
      .authWithPassword(pendingSuperadminPayload.email, pendingSuperadminPayload.password);

    const pendingSuperadminGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: pendingSuperadminUserRecord.id,
        role: "superadmin",
        status: "pending",
      });
    await superadminAndOrgAdminPb
      .collection(globalUserPermissionsCollectionName)
      .create(pendingSuperadminGlobalUserPermissionsPayload);

    await expect(
      pendingSuperadminPb
        .collection(organisationUserPermissionsCollectionName)
        .delete(superadminAndOrgAdminOrganisationUserPermissionRecord.id),
    ).rejects.toThrow();
  });

  it("PDBP-OUP-DELETE-03 — Global Admin cannot DELETE", async () => {
    const superadminAndOrgAdminPb = createPbConnection();
    const superadminAndOrgAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const superadminAndOrgAdminUserRecord = await superadminAndOrgAdminPb
      .collection(usersCollectionName)
      .create(superadminAndOrgAdminUserPayload);
    await superadminAndOrgAdminPb
      .collection(usersCollectionName)
      .authWithPassword(
        superadminAndOrgAdminUserPayload.email,
        superadminAndOrgAdminUserPayload.password,
      );

    const organisationPayload = organisationsPayloadBuilder.forCreateRandomData();
    const organisationRecord = await superadminAndOrgAdminPb
      .collection(organisationsCollectionName)
      .create(organisationPayload);

    const organisationUserPermissionRecords = await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .getFullList();

    const superadminAndOrgAdminOrganisationUserPermissionRecord =
      organisationUserPermissionRecords.find(
        (record) =>
          record.userId === superadminAndOrgAdminUserRecord.id &&
          record.orgId === organisationRecord.id,
      );

    if (!superadminAndOrgAdminOrganisationUserPermissionRecord)
      return expect(superadminAndOrgAdminOrganisationUserPermissionRecord).toBeTruthy();

    const adminOnlyPb = createPbConnection();
    const adminOnlyUserPayload = userPayloadBuilder.forCreateRandomData();
    const adminOnlyUserRecord = await adminOnlyPb
      .collection(usersCollectionName)
      .create(adminOnlyUserPayload);
    await adminOnlyPb
      .collection(usersCollectionName)
      .authWithPassword(adminOnlyUserPayload.email, adminOnlyUserPayload.password);

    const superadminOnlyGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: adminOnlyUserRecord.id,
        role: "admin",
        status: "approved",
      });
    await superadminAndOrgAdminPb
      .collection(globalUserPermissionsCollectionName)
      .create(superadminOnlyGlobalUserPermissionsPayload);

    await expect(
      adminOnlyPb
        .collection(organisationUserPermissionsCollectionName)
        .delete(superadminAndOrgAdminOrganisationUserPermissionRecord.id),
    ).rejects.toThrow();
  });

  it("PDBP-OUP-DELETE-04 — Global Standard cannot DELETE", async () => {
    const superadminAndOrgAdminPb = createPbConnection();
    const superadminAndOrgAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const superadminAndOrgAdminUserRecord = await superadminAndOrgAdminPb
      .collection(usersCollectionName)
      .create(superadminAndOrgAdminUserPayload);
    await superadminAndOrgAdminPb
      .collection(usersCollectionName)
      .authWithPassword(
        superadminAndOrgAdminUserPayload.email,
        superadminAndOrgAdminUserPayload.password,
      );

    const organisationPayload = organisationsPayloadBuilder.forCreateRandomData();
    const organisationRecord = await superadminAndOrgAdminPb
      .collection(organisationsCollectionName)
      .create(organisationPayload);

    const organisationUserPermissionRecords = await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .getFullList();

    const superadminAndOrgAdminOrganisationUserPermissionRecord =
      organisationUserPermissionRecords.find(
        (record) =>
          record.userId === superadminAndOrgAdminUserRecord.id &&
          record.orgId === organisationRecord.id,
      );

    if (!superadminAndOrgAdminOrganisationUserPermissionRecord)
      return expect(superadminAndOrgAdminOrganisationUserPermissionRecord).toBeTruthy();

    const standardPb = createPbConnection();
    const standardUserPayload = userPayloadBuilder.forCreateRandomData();
    const standardUserRecord = await standardPb
      .collection(usersCollectionName)
      .create(standardUserPayload);
    await standardPb
      .collection(usersCollectionName)
      .authWithPassword(standardUserPayload.email, standardUserPayload.password);

    const pendingSuperadminGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: standardUserRecord.id,
        role: "standard",
        status: "approved",
      });
    await superadminAndOrgAdminPb
      .collection(globalUserPermissionsCollectionName)
      .create(pendingSuperadminGlobalUserPermissionsPayload);

    await expect(
      standardPb
        .collection(organisationUserPermissionsCollectionName)
        .delete(superadminAndOrgAdminOrganisationUserPermissionRecord.id),
    ).rejects.toThrow();
  });
  it("PDBP-OUP-DELETE-05 — Organisation Admin (approved) can DELETE", async () => {
    const superadminAndOrgAdminPb = createPbConnection();
    const superadminAndOrgAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const superadminAndOrgAdminUserRecord = await superadminAndOrgAdminPb
      .collection(usersCollectionName)
      .create(superadminAndOrgAdminUserPayload);
    await superadminAndOrgAdminPb
      .collection(usersCollectionName)
      .authWithPassword(
        superadminAndOrgAdminUserPayload.email,
        superadminAndOrgAdminUserPayload.password,
      );

    const organisationPayload = organisationsPayloadBuilder.forCreateRandomData();
    const organisationRecord = await superadminAndOrgAdminPb
      .collection(organisationsCollectionName)
      .create(organisationPayload);

    const organisationUserPermissionRecords = await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .getFullList();

    const superadminAndOrgAdminOrganisationUserPermissionRecord =
      organisationUserPermissionRecords.find(
        (record) =>
          record.userId === superadminAndOrgAdminUserRecord.id &&
          record.orgId === organisationRecord.id,
      );

    if (!superadminAndOrgAdminOrganisationUserPermissionRecord)
      return expect(superadminAndOrgAdminOrganisationUserPermissionRecord).toBeTruthy();

    const organisationAdminPb = createPbConnection();
    const organisationAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const organisationAdminUserRecord = await organisationAdminPb
      .collection(usersCollectionName)
      .create(organisationAdminUserPayload);
    await organisationAdminPb
      .collection(usersCollectionName)
      .authWithPassword(organisationAdminUserPayload.email, organisationAdminUserPayload.password);

    const organisationAdminOrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        userId: organisationAdminUserRecord.id,
        orgId: organisationRecord.id,
        role: "admin",
        status: "approved",
      });
    await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(organisationAdminOrganisationUserPermissionsPayload);

    await expect(
      organisationAdminPb
        .collection(organisationUserPermissionsCollectionName)
        .delete(superadminAndOrgAdminOrganisationUserPermissionRecord.id),
    ).resolves.toBe(true);
  });
  it("PDBP-OUP-DELETE-06 — Organisation Admin (pending or blocked) cannot DELETE", async () => {
    const superadminAndOrgAdminPb = createPbConnection();
    const superadminAndOrgAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const superadminAndOrgAdminUserRecord = await superadminAndOrgAdminPb
      .collection(usersCollectionName)
      .create(superadminAndOrgAdminUserPayload);
    await superadminAndOrgAdminPb
      .collection(usersCollectionName)
      .authWithPassword(
        superadminAndOrgAdminUserPayload.email,
        superadminAndOrgAdminUserPayload.password,
      );

    const organisationPayload = organisationsPayloadBuilder.forCreateRandomData();
    const organisationRecord = await superadminAndOrgAdminPb
      .collection(organisationsCollectionName)
      .create(organisationPayload);

    const organisationUserPermissionRecords = await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .getFullList();

    const superadminAndOrgAdminOrganisationUserPermissionRecord =
      organisationUserPermissionRecords.find(
        (record) =>
          record.userId === superadminAndOrgAdminUserRecord.id &&
          record.orgId === organisationRecord.id,
      );

    if (!superadminAndOrgAdminOrganisationUserPermissionRecord)
      return expect(superadminAndOrgAdminOrganisationUserPermissionRecord).toBeTruthy();

    const pendingOrganisationAdminPb = createPbConnection();
    const pendingOrganisationAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const organisationAdminUserRecord = await pendingOrganisationAdminPb
      .collection(usersCollectionName)
      .create(pendingOrganisationAdminUserPayload);
    await pendingOrganisationAdminPb
      .collection(usersCollectionName)
      .authWithPassword(
        pendingOrganisationAdminUserPayload.email,
        pendingOrganisationAdminUserPayload.password,
      );

    const organisationAdminOrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        userId: organisationAdminUserRecord.id,
        orgId: organisationRecord.id,
        role: "admin",
        status: "pending",
      });
    await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(organisationAdminOrganisationUserPermissionsPayload);

    await expect(
      pendingOrganisationAdminPb
        .collection(organisationUserPermissionsCollectionName)
        .delete(superadminAndOrgAdminOrganisationUserPermissionRecord.id),
    ).rejects.toThrow();
  });
  it("PDBP-OUP-DELETE-07 — Organisation Standard cannot DELETE", async () => {
    const superadminAndOrgAdminPb = createPbConnection();
    const superadminAndOrgAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const superadminAndOrgAdminUserRecord = await superadminAndOrgAdminPb
      .collection(usersCollectionName)
      .create(superadminAndOrgAdminUserPayload);
    await superadminAndOrgAdminPb
      .collection(usersCollectionName)
      .authWithPassword(
        superadminAndOrgAdminUserPayload.email,
        superadminAndOrgAdminUserPayload.password,
      );

    const organisationPayload = organisationsPayloadBuilder.forCreateRandomData();
    const organisationRecord = await superadminAndOrgAdminPb
      .collection(organisationsCollectionName)
      .create(organisationPayload);

    const organisationUserPermissionRecords = await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .getFullList();

    const superadminAndOrgAdminOrganisationUserPermissionRecord =
      organisationUserPermissionRecords.find(
        (record) =>
          record.userId === superadminAndOrgAdminUserRecord.id &&
          record.orgId === organisationRecord.id,
      );

    if (!superadminAndOrgAdminOrganisationUserPermissionRecord)
      return expect(superadminAndOrgAdminOrganisationUserPermissionRecord).toBeTruthy();

    const organisationStandardUserPb = createPbConnection();
    const organisationStandardUserPayload = userPayloadBuilder.forCreateRandomData();
    const organisationStandardUserRecord = await organisationStandardUserPb
      .collection(usersCollectionName)
      .create(organisationStandardUserPayload);
    await organisationStandardUserPb
      .collection(usersCollectionName)
      .authWithPassword(
        organisationStandardUserPayload.email,
        organisationStandardUserPayload.password,
      );

    const organisationAdminOrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        userId: organisationStandardUserRecord.id,
        orgId: organisationRecord.id,
        role: "standard",
        status: "approved",
      });
    await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(organisationAdminOrganisationUserPermissionsPayload);

    await expect(
      organisationStandardUserPb
        .collection(organisationUserPermissionsCollectionName)
        .delete(superadminAndOrgAdminOrganisationUserPermissionRecord.id),
    ).rejects.toThrow();
  });

  it("PDBP-OUP-DELETE-OWN-01 — Organisation Admin cannot DELETE OWN", async () => {
    const superadminAndOrgAdminPb = createPbConnection();
    const superadminAndOrgAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminAndOrgAdminPb
      .collection(usersCollectionName)
      .create(superadminAndOrgAdminUserPayload);
    await superadminAndOrgAdminPb
      .collection(usersCollectionName)
      .authWithPassword(
        superadminAndOrgAdminUserPayload.email,
        superadminAndOrgAdminUserPayload.password,
      );

    const organisationPayload = organisationsPayloadBuilder.forCreateRandomData();
    const organisationRecord = await superadminAndOrgAdminPb
      .collection(organisationsCollectionName)
      .create(organisationPayload);

    const organisationAdminUserPb = createPbConnection();
    const organisationAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const organisationAdminUserRecord = await organisationAdminUserPb
      .collection(usersCollectionName)
      .create(organisationAdminUserPayload);
    await organisationAdminUserPb
      .collection(usersCollectionName)
      .authWithPassword(organisationAdminUserPayload.email, organisationAdminUserPayload.password);

    const organisationAdminOrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        userId: organisationAdminUserRecord.id,
        orgId: organisationRecord.id,
        role: "admin",
        status: "approved",
      });
    const organisationStandardOrganisationUserPermissionRecord = await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(organisationAdminOrganisationUserPermissionsPayload);

    const testFn = (p: { pb: PocketBase }) =>
      p.pb
        .collection(organisationUserPermissionsCollectionName)
        .delete(organisationStandardOrganisationUserPermissionRecord.id);

    await expect(testFn({ pb: organisationAdminUserPb })).rejects.toThrow();
    await expect(testFn({ pb: superadminAndOrgAdminPb })).resolves.toBe(true);
  });
  it("PDBP-OUP-DELETE-OWN-02 — Organisation Standard cannot DELETE OWN", async () => {
    const superadminAndOrgAdminPb = createPbConnection();
    const superadminAndOrgAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminAndOrgAdminPb
      .collection(usersCollectionName)
      .create(superadminAndOrgAdminUserPayload);
    await superadminAndOrgAdminPb
      .collection(usersCollectionName)
      .authWithPassword(
        superadminAndOrgAdminUserPayload.email,
        superadminAndOrgAdminUserPayload.password,
      );

    const organisationPayload = organisationsPayloadBuilder.forCreateRandomData();
    const organisationRecord = await superadminAndOrgAdminPb
      .collection(organisationsCollectionName)
      .create(organisationPayload);

    const organisationStandardUserPb = createPbConnection();
    const organisationStandardUserPayload = userPayloadBuilder.forCreateRandomData();
    const organisationStandardUserRecord = await organisationStandardUserPb
      .collection(usersCollectionName)
      .create(organisationStandardUserPayload);
    await organisationStandardUserPb
      .collection(usersCollectionName)
      .authWithPassword(
        organisationStandardUserPayload.email,
        organisationStandardUserPayload.password,
      );

    const organisationStandardOrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        userId: organisationStandardUserRecord.id,
        orgId: organisationRecord.id,
        role: "standard",
        status: "approved",
      });
    const organisationStandardOrganisationUserPermissionRecord = await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(organisationStandardOrganisationUserPermissionsPayload);

    const testFn = (p: { pb: PocketBase }) =>
      p.pb
        .collection(organisationUserPermissionsCollectionName)
        .delete(organisationStandardOrganisationUserPermissionRecord.id);
    await expect(testFn({ pb: organisationStandardUserPb })).rejects.toThrow();
    await expect(testFn({ pb: superadminAndOrgAdminPb })).resolves.toBe(true);
  });
});
