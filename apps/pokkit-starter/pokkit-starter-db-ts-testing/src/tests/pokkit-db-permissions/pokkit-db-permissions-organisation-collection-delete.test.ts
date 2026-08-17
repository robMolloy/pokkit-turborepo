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
  usersCollectionName,
  globalUserPermissionsPayloadBuilder,
  organisationsPayloadBuilder,
  organisationUserPermissionsCollectionName,
  organisationUserPermissionsPayloadBuilder,
  organisationsCollectionName,
  globalUserPermissionsCollectionName,
} from "@repo/pokkit-db-permissions-ts-helpers";

const testMetadata =
  pokkitDbPermissionsTestsMetadata.pokkitDbPermissionsOrganisationsCollectionDelete;
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

  it("PDBP-ORG-DELETE-01 — Global Superadmin can DELETE", async () => {
    const superadminPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminPb.collection(usersCollectionName).create(superadminUserPayload);
    await superadminPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    const organisationPayload = organisationsPayloadBuilder.forCreateData({
      name: "Test Organisation",
      description: "Test Description",
    });
    const createdOrganisationRecord = await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationPayload);

    const deleteResp = await superadminPb
      .collection(organisationsCollectionName)
      .delete(createdOrganisationRecord.id);
    expect(deleteResp).toBe(true);
  });

  it("PDBP-ORG-DELETE-02 — Global Admin cannot DELETE", async () => {
    const superadminPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminPb.collection(usersCollectionName).create(superadminUserPayload);
    await superadminPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    const adminPb = createPbConnection();
    const adminUserPayload = userPayloadBuilder.forCreateRandomData();
    const adminUserRecord = await adminPb.collection(usersCollectionName).create(adminUserPayload);
    await adminPb
      .collection(usersCollectionName)
      .authWithPassword(adminUserPayload.email, adminUserPayload.password);

    const adminGlobalUserPermissionsPayload = globalUserPermissionsPayloadBuilder.forCreateData({
      userId: adminUserRecord.id,
      role: "admin",
      status: "approved",
    });
    await superadminPb
      .collection(globalUserPermissionsCollectionName)
      .create(adminGlobalUserPermissionsPayload);

    const organisationPayload = organisationsPayloadBuilder.forCreateData({
      name: "Test Organisation",
      description: "Test Description",
    });
    const createdOrganisationRecord = await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationPayload);

    const deleteTestFn = (p: { pb: PocketBase }) =>
      p.pb.collection(organisationsCollectionName).delete(createdOrganisationRecord.id);
    await expect(deleteTestFn({ pb: adminPb })).rejects.toThrow();
    await expect(deleteTestFn({ pb: superadminPb })).resolves.toBe(true);
  });

  it("PDBP-ORG-DELETE-03 — Global Standard cannot DELETE", async () => {
    const superadminPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminPb.collection(usersCollectionName).create(superadminUserPayload);
    await superadminPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    const standardPb = createPbConnection();
    const standardUserPayload = userPayloadBuilder.forCreateRandomData();
    const standardUserRecord = await standardPb
      .collection(usersCollectionName)
      .create(standardUserPayload);
    await standardPb
      .collection(usersCollectionName)
      .authWithPassword(standardUserPayload.email, standardUserPayload.password);

    const standardGlobalUserPermissionsPayload = globalUserPermissionsPayloadBuilder.forCreateData({
      userId: standardUserRecord.id,
      role: "standard",
      status: "approved",
    });
    await superadminPb
      .collection(globalUserPermissionsCollectionName)
      .create(standardGlobalUserPermissionsPayload);

    const organisationPayload = organisationsPayloadBuilder.forCreateData({
      name: "Test Organisation",
      description: "Test Description",
    });
    const createdOrganisationRecord = await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationPayload);

    const deleteTestFn = (p: { pb: PocketBase }) =>
      p.pb.collection(organisationsCollectionName).delete(createdOrganisationRecord.id);
    await expect(deleteTestFn({ pb: standardPb })).rejects.toThrow();
    await expect(deleteTestFn({ pb: superadminPb })).resolves.toBe(true);
  });

  it("PDBP-ORG-DELETE-04 — Organisation Admin (approved) can DELETE", async () => {
    const superadminPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminPb.collection(usersCollectionName).create(superadminUserPayload);
    await superadminPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    const orgAdminPb = createPbConnection();
    const orgAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const orgAdminUserRecord = await orgAdminPb
      .collection(usersCollectionName)
      .create(orgAdminUserPayload);
    await orgAdminPb
      .collection(usersCollectionName)
      .authWithPassword(orgAdminUserPayload.email, orgAdminUserPayload.password);

    const organisationPayload = organisationsPayloadBuilder.forCreateData({
      name: "Test Organisation",
      description: "Test Description",
    });
    const organisationRecord = await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationPayload);

    const orgAdminOrganisationsUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisationRecord.id,
        userId: orgAdminUserRecord.id,
        role: "admin",
        status: "approved",
      });

    await superadminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(orgAdminOrganisationsUserPermissionsPayload);

    await expect(
      orgAdminPb.collection(organisationsCollectionName).delete(organisationRecord.id),
    ).resolves.toBe(true);
  });

  it("PDBP-ORG-DELETE-05 — Organisation Admin (pending or blocked) cannot DELETE", async () => {
    const superadminPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminPb.collection(usersCollectionName).create(superadminUserPayload);
    await superadminPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    const organisationPayload = organisationsPayloadBuilder.forCreateData({
      name: "Test Organisation",
      description: "Test Description",
    });
    const organisationRecord = await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationPayload);

    const pendingOrgAdminPb = createPbConnection();
    const pendingOrgAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const pendingOrgAdminUserRecord = await pendingOrgAdminPb
      .collection(usersCollectionName)
      .create(pendingOrgAdminUserPayload);
    await pendingOrgAdminPb
      .collection(usersCollectionName)
      .authWithPassword(pendingOrgAdminUserPayload.email, pendingOrgAdminUserPayload.password);

    const pendingOrgAdminOrganisationsUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisationRecord.id,
        userId: pendingOrgAdminUserRecord.id,
        role: "admin",
        status: "pending",
      });
    await superadminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(pendingOrgAdminOrganisationsUserPermissionsPayload);

    const blockedOrgAdminPb = createPbConnection();
    const blockedOrgAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const blockedOrgAdminUserRecord = await blockedOrgAdminPb
      .collection(usersCollectionName)
      .create(blockedOrgAdminUserPayload);
    await blockedOrgAdminPb
      .collection(usersCollectionName)
      .authWithPassword(blockedOrgAdminUserPayload.email, blockedOrgAdminUserPayload.password);

    const blockedOrgAdminOrganisationsUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisationRecord.id,
        userId: blockedOrgAdminUserRecord.id,
        role: "admin",
        status: "blocked",
      });

    await superadminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(blockedOrgAdminOrganisationsUserPermissionsPayload);

    const deleteTestFn = (p: { pb: PocketBase }) =>
      p.pb.collection(organisationsCollectionName).delete(organisationRecord.id);
    await expect(deleteTestFn({ pb: pendingOrgAdminPb })).rejects.toThrow();
    await expect(deleteTestFn({ pb: blockedOrgAdminPb })).rejects.toThrow();
    await expect(deleteTestFn({ pb: superadminPb })).resolves.toBe(true);
  });

  it("PDBP-ORG-DELETE-06 — Organisation Standard cannot DELETE", async () => {
    const superadminPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminPb.collection(usersCollectionName).create(superadminUserPayload);
    await superadminPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    const orgStandardPb = createPbConnection();
    const orgStandardUserPayload = userPayloadBuilder.forCreateRandomData();
    const orgStandardUserRecord = await orgStandardPb
      .collection(usersCollectionName)
      .create(orgStandardUserPayload);
    await orgStandardPb
      .collection(usersCollectionName)
      .authWithPassword(orgStandardUserPayload.email, orgStandardUserPayload.password);

    const organisationPayload = organisationsPayloadBuilder.forCreateData({
      name: "Test Organisation",
      description: "Test Description",
    });
    const organisationRecord = await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationPayload);

    const orgStandardOrganisationsUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisationRecord.id,
        userId: orgStandardUserRecord.id,
        role: "standard",
        status: "approved",
      });

    await superadminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(orgStandardOrganisationsUserPermissionsPayload);

    const deleteTestFn = (p: { pb: PocketBase }) =>
      p.pb.collection(organisationsCollectionName).delete(organisationRecord.id);
    await expect(deleteTestFn({ pb: orgStandardPb })).rejects.toThrow();
    await expect(deleteTestFn({ pb: superadminPb })).resolves.toBe(true);
  });
});
