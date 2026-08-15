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

const testMetadata =
  pokkitDbPermissionsTestsMetadata.pokkitDbPermissionsOrganisationsCollectionView;
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

  // it("PDBP-ORG-VIEW-01 — Global Superadmin can VIEW", async () => {
  //   const superadminPb = createPbConnection();
  //   const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
  //   await superadminPb.collection(usersCollectionName).create(superadminUserPayload);
  //   await superadminPb
  //     .collection(usersCollectionName)
  //     .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

  //   const organisationPayload = organisationsPayloadBuilder.forCreateRandomData();
  //   const organisationRecord = await superadminPb
  //     .collection(organisationsCollectionName)
  //     .create(organisationPayload);

  //   const viewedOrganisation = await superadminPb
  //     .collection(organisationsCollectionName)
  //     .getOne(organisationRecord.id);
  //   expect(viewedOrganisation).toMatchObject(organisationPayload);
  // });

  // it("PDBP-ORG-VIEW-02 — Global Admin (approved) can VIEW", async () => {
  //   const superadminPb = createPbConnection();
  //   const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
  //   await superadminPb.collection(usersCollectionName).create(superadminUserPayload);
  //   await superadminPb
  //     .collection(usersCollectionName)
  //     .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

  //   const organisationPayload = organisationsPayloadBuilder.forCreateRandomData();
  //   const organisationRecord = await superadminPb
  //     .collection(organisationsCollectionName)
  //     .create(organisationPayload);

  //   const adminPb = createPbConnection();
  //   const adminUserPayload = userPayloadBuilder.forCreateRandomData();
  //   const adminUserRecord = await adminPb.collection(usersCollectionName).create(adminUserPayload);
  //   await adminPb
  //     .collection(usersCollectionName)
  //     .authWithPassword(adminUserPayload.email, adminUserPayload.password);

  //   await superadminPb.collection(globalUserPermissionsCollectionName).create(
  //     globalUserPermissionsPayloadBuilder.forCreateData({
  //       userId: adminUserRecord.id,
  //       role: "admin",
  //       status: "approved",
  //     }),
  //   );

  //   const viewedOrganisation = await adminPb
  //     .collection(organisationsCollectionName)
  //     .getOne(organisationRecord.id);
  //   expect(viewedOrganisation).toMatchObject(organisationPayload);
  // });

  // it("PDBP-ORG-VIEW-03 — Global Admin (pending or blocked) cannot VIEW", async () => {
  //   const superadminPb = createPbConnection();
  //   const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
  //   await superadminPb.collection(usersCollectionName).create(superadminUserPayload);
  //   await superadminPb
  //     .collection(usersCollectionName)
  //     .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

  //   const organisationPayload = organisationsPayloadBuilder.forCreateRandomData();
  //   const organisationRecord = await superadminPb
  //     .collection(organisationsCollectionName)
  //     .create(organisationPayload);

  //   const pendingAdminPb = createPbConnection();
  //   const pendingAdminUserPayload = userPayloadBuilder.forCreateRandomData();
  //   const pendingAdminUserRecord = await pendingAdminPb
  //     .collection(usersCollectionName)
  //     .create(pendingAdminUserPayload);
  //   await pendingAdminPb
  //     .collection(usersCollectionName)
  //     .authWithPassword(pendingAdminUserPayload.email, pendingAdminUserPayload.password);

  //   const blockedAdminPb = createPbConnection();
  //   const blockedAdminUserPayload = userPayloadBuilder.forCreateRandomData();
  //   const blockedAdminUserRecord = await blockedAdminPb
  //     .collection(usersCollectionName)
  //     .create(blockedAdminUserPayload);
  //   await blockedAdminPb
  //     .collection(usersCollectionName)
  //     .authWithPassword(blockedAdminUserPayload.email, blockedAdminUserPayload.password);

  //   await superadminPb.collection(globalUserPermissionsCollectionName).create(
  //     globalUserPermissionsPayloadBuilder.forCreateData({
  //       userId: pendingAdminUserRecord.id,
  //       role: "admin",
  //       status: "pending",
  //     }),
  //   );
  //   await superadminPb.collection(globalUserPermissionsCollectionName).create(
  //     globalUserPermissionsPayloadBuilder.forCreateData({
  //       userId: blockedAdminUserRecord.id,
  //       role: "admin",
  //       status: "blocked",
  //     }),
  //   );

  //   const viewOrganisationTestFn = (p: { pb: PocketBase }) =>
  //     p.pb.collection(organisationsCollectionName).getOne(organisationRecord.id);
  //   await expect(viewOrganisationTestFn({ pb: pendingAdminPb })).rejects.toThrow();
  //   await expect(viewOrganisationTestFn({ pb: blockedAdminPb })).rejects.toThrow();
  // });

  // it("PDBP-ORG-VIEW-04 — Global Standard (approved) can VIEW", async () => {
  //   const superadminPb = createPbConnection();
  //   const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
  //   await superadminPb.collection(usersCollectionName).create(superadminUserPayload);
  //   await superadminPb
  //     .collection(usersCollectionName)
  //     .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

  //   const organisationPayload = organisationsPayloadBuilder.forCreateRandomData();
  //   const organisationRecord = await superadminPb
  //     .collection(organisationsCollectionName)
  //     .create(organisationPayload);

  //   const standardPb = createPbConnection();
  //   const standardUserPayload = userPayloadBuilder.forCreateRandomData();
  //   const standardUserRecord = await standardPb
  //     .collection(usersCollectionName)
  //     .create(standardUserPayload);
  //   await standardPb
  //     .collection(usersCollectionName)
  //     .authWithPassword(standardUserPayload.email, standardUserPayload.password);

  //   await superadminPb.collection(globalUserPermissionsCollectionName).create(
  //     globalUserPermissionsPayloadBuilder.forCreateData({
  //       userId: standardUserRecord.id,
  //       role: "standard",
  //       status: "approved",
  //     }),
  //   );

  //   const viewedOrganisation = await standardPb
  //     .collection(organisationsCollectionName)
  //     .getOne(organisationRecord.id);
  //   expect(viewedOrganisation).toMatchObject(organisationPayload);
  // });

  // it("PDBP-ORG-VIEW-05 — Global Standard (pending or blocked) cannot VIEW", async () => {
  //   const superadminPb = createPbConnection();
  //   const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
  //   await superadminPb.collection(usersCollectionName).create(superadminUserPayload);
  //   await superadminPb
  //     .collection(usersCollectionName)
  //     .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

  //   const organisationPayload = organisationsPayloadBuilder.forCreateRandomData();
  //   const organisationRecord = await superadminPb
  //     .collection(organisationsCollectionName)
  //     .create(organisationPayload);

  //   const pendingStandardPb = createPbConnection();
  //   const pendingStandardUserPayload = userPayloadBuilder.forCreateRandomData();
  //   const pendingStandardUserRecord = await pendingStandardPb
  //     .collection(usersCollectionName)
  //     .create(pendingStandardUserPayload);
  //   await pendingStandardPb
  //     .collection(usersCollectionName)
  //     .authWithPassword(pendingStandardUserPayload.email, pendingStandardUserPayload.password);

  //   const blockedStandardPb = createPbConnection();
  //   const blockedStandardUserPayload = userPayloadBuilder.forCreateRandomData();
  //   const blockedStandardUserRecord = await blockedStandardPb
  //     .collection(usersCollectionName)
  //     .create(blockedStandardUserPayload);
  //   await blockedStandardPb
  //     .collection(usersCollectionName)
  //     .authWithPassword(blockedStandardUserPayload.email, blockedStandardUserPayload.password);

  //   await superadminPb.collection(globalUserPermissionsCollectionName).create(
  //     globalUserPermissionsPayloadBuilder.forCreateData({
  //       userId: pendingStandardUserRecord.id,
  //       role: "standard",
  //       status: "pending",
  //     }),
  //   );
  //   await superadminPb.collection(globalUserPermissionsCollectionName).create(
  //     globalUserPermissionsPayloadBuilder.forCreateData({
  //       userId: blockedStandardUserRecord.id,
  //       role: "standard",
  //       status: "blocked",
  //     }),
  //   );

  //   const viewOrganisationTestFn = (p: { pb: PocketBase }) =>
  //     p.pb.collection(organisationsCollectionName).getOne(organisationRecord.id);
  //   await expect(viewOrganisationTestFn({ pb: pendingStandardPb })).rejects.toThrow();
  //   await expect(viewOrganisationTestFn({ pb: blockedStandardPb })).rejects.toThrow();
  // });

  // it("PDBP-ORG-VIEW-06 — Organisation Admin can VIEW", async () => {
  //   const superadminPb = createPbConnection();
  //   const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
  //   await superadminPb.collection(usersCollectionName).create(superadminUserPayload);
  //   await superadminPb
  //     .collection(usersCollectionName)
  //     .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

  //   const organisationPayload = organisationsPayloadBuilder.forCreateRandomData();
  //   const organisationRecord = await superadminPb
  //     .collection(organisationsCollectionName)
  //     .create(organisationPayload);

  //   const pendingOrgAdminPb = createPbConnection();
  //   const pendingOrgAdminUserPayload = userPayloadBuilder.forCreateRandomData();
  //   const pendingOrgAdminUserRecord = await pendingOrgAdminPb
  //     .collection(usersCollectionName)
  //     .create(pendingOrgAdminUserPayload);
  //   await pendingOrgAdminPb
  //     .collection(usersCollectionName)
  //     .authWithPassword(pendingOrgAdminUserPayload.email, pendingOrgAdminUserPayload.password);

  //   const approvedOrgAdminPb = createPbConnection();
  //   const approvedOrgAdminUserPayload = userPayloadBuilder.forCreateRandomData();
  //   const approvedOrgAdminUserRecord = await approvedOrgAdminPb
  //     .collection(usersCollectionName)
  //     .create(approvedOrgAdminUserPayload);
  //   await approvedOrgAdminPb
  //     .collection(usersCollectionName)
  //     .authWithPassword(approvedOrgAdminUserPayload.email, approvedOrgAdminUserPayload.password);

  //   const blockedOrgAdminPb = createPbConnection();
  //   const blockedOrgAdminUserPayload = userPayloadBuilder.forCreateRandomData();
  //   const blockedOrgAdminUserRecord = await blockedOrgAdminPb
  //     .collection(usersCollectionName)
  //     .create(blockedOrgAdminUserPayload);
  //   await blockedOrgAdminPb
  //     .collection(usersCollectionName)
  //     .authWithPassword(blockedOrgAdminUserPayload.email, blockedOrgAdminUserPayload.password);

  //   await superadminPb.collection(organisationUserPermissionsCollectionName).create(
  //     organisationsUserPermissionsPayloadBuilder.forCreateData({
  //       orgId: organisationRecord.id,
  //       userId: pendingOrgAdminUserRecord.id,
  //       role: "admin",
  //       status: "pending",
  //     }),
  //   );
  //   await superadminPb.collection(organisationUserPermissionsCollectionName).create(
  //     organisationsUserPermissionsPayloadBuilder.forCreateData({
  //       orgId: organisationRecord.id,
  //       userId: approvedOrgAdminUserRecord.id,
  //       role: "admin",
  //       status: "approved",
  //     }),
  //   );
  //   await superadminPb.collection(organisationUserPermissionsCollectionName).create(
  //     organisationsUserPermissionsPayloadBuilder.forCreateData({
  //       orgId: organisationRecord.id,
  //       userId: blockedOrgAdminUserRecord.id,
  //       role: "admin",
  //       status: "blocked",
  //     }),
  //   );

  //   const pendingViewedOrganisation = await pendingOrgAdminPb
  //     .collection(organisationsCollectionName)
  //     .getOne(organisationRecord.id);
  //   expect(pendingViewedOrganisation).toMatchObject(organisationPayload);
  //   const approvedViewedOrganisation = await approvedOrgAdminPb
  //     .collection(organisationsCollectionName)
  //     .getOne(organisationRecord.id);
  //   expect(approvedViewedOrganisation).toMatchObject(organisationPayload);
  //   const blockedViewedOrganisation = await blockedOrgAdminPb
  //     .collection(organisationsCollectionName)
  //     .getOne(organisationRecord.id);
  //   expect(blockedViewedOrganisation).toMatchObject(organisationPayload);
  // });

  // it("PDBP-ORG-VIEW-07 — Organisation Standard (approved) can VIEW", async () => {
  //   const superadminPb = createPbConnection();
  //   const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
  //   await superadminPb.collection(usersCollectionName).create(superadminUserPayload);
  //   await superadminPb
  //     .collection(usersCollectionName)
  //     .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

  //   const organisationPayload = organisationsPayloadBuilder.forCreateRandomData();
  //   const organisationRecord = await superadminPb
  //     .collection(organisationsCollectionName)
  //     .create(organisationPayload);

  //   const orgStandardPb = createPbConnection();
  //   const orgStandardUserPayload = userPayloadBuilder.forCreateRandomData();
  //   const orgStandardUserRecord = await orgStandardPb
  //     .collection(usersCollectionName)
  //     .create(orgStandardUserPayload);
  //   await orgStandardPb
  //     .collection(usersCollectionName)
  //     .authWithPassword(orgStandardUserPayload.email, orgStandardUserPayload.password);

  //   await superadminPb.collection(organisationUserPermissionsCollectionName).create(
  //     organisationsUserPermissionsPayloadBuilder.forCreateData({
  //       orgId: organisationRecord.id,
  //       userId: orgStandardUserRecord.id,
  //       role: "standard",
  //       status: "approved",
  //     }),
  //   );

  //   const viewedOrganisation = await orgStandardPb
  //     .collection(organisationsCollectionName)
  //     .getOne(organisationRecord.id);
  //   expect(viewedOrganisation).toMatchObject(organisationPayload);
  // });

  // it("PDBP-ORG-VIEW-08 — Organisation Standard (pending or blocked) cannot VIEW", async () => {
  //   const superadminPb = createPbConnection();
  //   const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
  //   await superadminPb.collection(usersCollectionName).create(superadminUserPayload);
  //   await superadminPb
  //     .collection(usersCollectionName)
  //     .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

  //   const organisationPayload = organisationsPayloadBuilder.forCreateRandomData();
  //   const organisationRecord = await superadminPb
  //     .collection(organisationsCollectionName)
  //     .create(organisationPayload);

  //   const pendingOrgStandardPb = createPbConnection();
  //   const pendingOrgStandardUserPayload = userPayloadBuilder.forCreateRandomData();
  //   const pendingOrgStandardUserRecord = await pendingOrgStandardPb
  //     .collection(usersCollectionName)
  //     .create(pendingOrgStandardUserPayload);
  //   await pendingOrgStandardPb
  //     .collection(usersCollectionName)
  //     .authWithPassword(
  //       pendingOrgStandardUserPayload.email,
  //       pendingOrgStandardUserPayload.password,
  //     );

  //   const blockedOrgStandardPb = createPbConnection();
  //   const blockedOrgStandardUserPayload = userPayloadBuilder.forCreateRandomData();
  //   const blockedOrgStandardUserRecord = await blockedOrgStandardPb
  //     .collection(usersCollectionName)
  //     .create(blockedOrgStandardUserPayload);
  //   await blockedOrgStandardPb
  //     .collection(usersCollectionName)
  //     .authWithPassword(
  //       blockedOrgStandardUserPayload.email,
  //       blockedOrgStandardUserPayload.password,
  //     );

  //   await superadminPb.collection(organisationUserPermissionsCollectionName).create(
  //     organisationsUserPermissionsPayloadBuilder.forCreateData({
  //       orgId: organisationRecord.id,
  //       userId: pendingOrgStandardUserRecord.id,
  //       role: "standard",
  //       status: "pending",
  //     }),
  //   );
  //   await superadminPb.collection(organisationUserPermissionsCollectionName).create(
  //     organisationsUserPermissionsPayloadBuilder.forCreateData({
  //       orgId: organisationRecord.id,
  //       userId: blockedOrgStandardUserRecord.id,
  //       role: "standard",
  //       status: "blocked",
  //     }),
  //   );

  //   const viewOrganisationTestFn = (p: { pb: PocketBase }) =>
  //     p.pb.collection(organisationsCollectionName).getOne(organisationRecord.id);
  //   await expect(viewOrganisationTestFn({ pb: pendingOrgStandardPb })).rejects.toThrow();
  //   await expect(viewOrganisationTestFn({ pb: blockedOrgStandardPb })).rejects.toThrow();
  //   await expect(viewOrganisationTestFn({ pb: superadminPb })).resolves.toBeTruthy();
  // });
});
