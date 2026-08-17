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
  globalUserPermissionsCollectionName,
  globalUserPermissionsPayloadBuilder,
  organisationsCollectionName,
  organisationsPayloadBuilder,
  organisationUserPermissionsPayloadBuilder,
  organisationUserPermissionsCollectionName,
} from "@repo/pokkit-db-permissions-ts-helpers";

const testMetadata =
  pokkitDbPermissionsTestsMetadata.pokkitDbPermissionsOrganisationsCollectionUpdate;
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

  it("PDBP-ORG-UPDATE-01 — Global Superadmin can UPDATE", async () => {
    const superadminPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminPb.collection(usersCollectionName).create(superadminUserPayload);
    await superadminPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    const organisationPayload = organisationsPayloadBuilder.forCreateRandomData();
    const organisationRecord = await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationPayload);

    const updatedOrganisationPayload = { ...organisationPayload, name: "Updated Organisation" };
    const updatedOrganisationRecord = await superadminPb
      .collection(organisationsCollectionName)
      .update(organisationRecord.id, updatedOrganisationPayload);

    expect(updatedOrganisationRecord).toMatchObject(updatedOrganisationPayload);
  });

  it("PDBP-ORG-UPDATE-02 — Global Admin cannot UPDATE", async () => {
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

    await superadminPb.collection(globalUserPermissionsCollectionName).create(
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: adminUserRecord.id,
        role: "admin",
        status: "approved",
      }),
    );

    const organisationPayload = organisationsPayloadBuilder.forCreateRandomData();
    const organisationRecord = await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationPayload);

    const updatedOrganisationPayload = { ...organisationPayload, name: "Updated Organisation" };

    const testFn = async (p: { pb: PocketBase }) =>
      p.pb
        .collection(organisationsCollectionName)
        .update(organisationRecord.id, updatedOrganisationPayload);

    await expect(testFn({ pb: adminPb })).rejects.toThrow();
    await expect(testFn({ pb: superadminPb })).resolves.toMatchObject(updatedOrganisationPayload);
  });
  it("PDBP-ORG-UPDATE-03 — Global Standard cannot UPDATE", async () => {
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

    await superadminPb.collection(globalUserPermissionsCollectionName).create(
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: standardUserRecord.id,
        role: "standard",
        status: "approved",
      }),
    );

    const organisationPayload = organisationsPayloadBuilder.forCreateRandomData();
    const organisationRecord = await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationPayload);

    const updatedOrganisationPayload = { ...organisationPayload, name: "Updated Organisation" };

    const testFn = async (p: { pb: PocketBase }) =>
      p.pb
        .collection(organisationsCollectionName)
        .update(organisationRecord.id, updatedOrganisationPayload);

    await expect(testFn({ pb: standardPb })).rejects.toThrow();
    await expect(testFn({ pb: superadminPb })).resolves.toMatchObject(updatedOrganisationPayload);
  });
  it("PDBP-ORG-UPDATE-04 — Organisation Admin (approved) can UPDATE", async () => {
    const superadminPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminPb.collection(usersCollectionName).create(superadminUserPayload);
    await superadminPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    const organisationPayload = organisationsPayloadBuilder.forCreateRandomData();
    const organisationRecord = await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationPayload);

    const orgAdminPb = createPbConnection();
    const orgAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const orgAdminUserRecord = await orgAdminPb
      .collection(usersCollectionName)
      .create(orgAdminUserPayload);
    await orgAdminPb
      .collection(usersCollectionName)
      .authWithPassword(orgAdminUserPayload.email, orgAdminUserPayload.password);

    await superadminPb.collection(organisationUserPermissionsCollectionName).create(
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisationRecord.id,
        userId: orgAdminUserRecord.id,
        role: "admin",
        status: "approved",
      }),
    );

    const updatedOrganisationPayload = { ...organisationPayload, name: "Updated Organisation" };

    await expect(
      orgAdminPb
        .collection(organisationsCollectionName)
        .update(organisationRecord.id, updatedOrganisationPayload),
    ).resolves.toMatchObject(updatedOrganisationPayload);
  });
  it("PDBP-ORG-UPDATE-05 — Organisation Admin (pending or blocked) cannot UPDATE", async () => {
    const superadminPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminPb.collection(usersCollectionName).create(superadminUserPayload);
    await superadminPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    const organisationPayload = organisationsPayloadBuilder.forCreateRandomData();
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

    await superadminPb.collection(organisationUserPermissionsCollectionName).create(
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisationRecord.id,
        userId: pendingOrgAdminUserRecord.id,
        role: "admin",
        status: "pending",
      }),
    );

    const blockedOrgAdminPb = createPbConnection();
    const blockedOrgAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const blockedOrgAdminUserRecord = await blockedOrgAdminPb
      .collection(usersCollectionName)
      .create(blockedOrgAdminUserPayload);
    await blockedOrgAdminPb
      .collection(usersCollectionName)
      .authWithPassword(blockedOrgAdminUserPayload.email, blockedOrgAdminUserPayload.password);

    await superadminPb.collection(organisationUserPermissionsCollectionName).create(
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisationRecord.id,
        userId: blockedOrgAdminUserRecord.id,
        role: "admin",
        status: "blocked",
      }),
    );

    const updatedOrganisationPayload = { ...organisationPayload, name: "Updated Organisation" };

    const testFn = async (p: { pb: PocketBase }) =>
      p.pb
        .collection(organisationsCollectionName)
        .update(organisationRecord.id, updatedOrganisationPayload);
    await expect(testFn({ pb: pendingOrgAdminPb })).rejects.toThrow();
    await expect(testFn({ pb: blockedOrgAdminPb })).rejects.toThrow();
  });
  it("PDBP-ORG-UPDATE-06 — Organisation Standard cannot UPDATE", async () => {
    const superadminPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminPb.collection(usersCollectionName).create(superadminUserPayload);
    await superadminPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    const organisationPayload = organisationsPayloadBuilder.forCreateRandomData();
    const organisationRecord = await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationPayload);

    const orgStandardPb = createPbConnection();
    const orgStandardUserPayload = userPayloadBuilder.forCreateRandomData();
    const orgStandardUserRecord = await orgStandardPb
      .collection(usersCollectionName)
      .create(orgStandardUserPayload);
    await orgStandardPb
      .collection(usersCollectionName)
      .authWithPassword(orgStandardUserPayload.email, orgStandardUserPayload.password);

    await superadminPb.collection(organisationUserPermissionsCollectionName).create(
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisationRecord.id,
        userId: orgStandardUserRecord.id,
        role: "standard",
        status: "approved",
      }),
    );

    const pendingOrgStandardPb = createPbConnection();
    const pendingOrgStandardUserPayload = userPayloadBuilder.forCreateRandomData();
    const pendingOrgStandardUserRecord = await pendingOrgStandardPb
      .collection(usersCollectionName)
      .create(pendingOrgStandardUserPayload);
    await pendingOrgStandardPb
      .collection(usersCollectionName)
      .authWithPassword(
        pendingOrgStandardUserPayload.email,
        pendingOrgStandardUserPayload.password,
      );

    await superadminPb.collection(organisationUserPermissionsCollectionName).create(
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisationRecord.id,
        userId: pendingOrgStandardUserRecord.id,
        role: "standard",
        status: "pending",
      }),
    );

    const blockedOrgStandardPb = createPbConnection();
    const blockedOrgStandardUserPayload = userPayloadBuilder.forCreateRandomData();
    const blockedOrgStandardUserRecord = await blockedOrgStandardPb
      .collection(usersCollectionName)
      .create(blockedOrgStandardUserPayload);
    await blockedOrgStandardPb
      .collection(usersCollectionName)
      .authWithPassword(
        blockedOrgStandardUserPayload.email,
        blockedOrgStandardUserPayload.password,
      );

    await superadminPb.collection(organisationUserPermissionsCollectionName).create(
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisationRecord.id,
        userId: blockedOrgStandardUserRecord.id,
        role: "standard",
        status: "blocked",
      }),
    );

    const updatedOrganisationPayload = { ...organisationPayload, name: "Updated Organisation" };

    const testFn = async (p: { pb: PocketBase }) =>
      p.pb
        .collection(organisationsCollectionName)
        .update(organisationRecord.id, updatedOrganisationPayload);
    await expect(testFn({ pb: pendingOrgStandardPb })).rejects.toThrow();
    await expect(testFn({ pb: blockedOrgStandardPb })).rejects.toThrow();
    await expect(testFn({ pb: orgStandardPb })).rejects.toThrow();
  });
});
