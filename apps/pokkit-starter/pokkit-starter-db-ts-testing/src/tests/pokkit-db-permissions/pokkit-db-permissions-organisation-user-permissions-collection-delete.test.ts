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

    const approvedSuperadminPb = createPbConnection();
    const approvedSuperadminUserPayload = userPayloadBuilder.forCreateRandomData();
    const approvedSuperadminUserRecord = await approvedSuperadminPb
      .collection(usersCollectionName)
      .create(approvedSuperadminUserPayload);
    await approvedSuperadminPb
      .collection(usersCollectionName)
      .authWithPassword(
        approvedSuperadminUserPayload.email,
        approvedSuperadminUserPayload.password,
      );

    const approvedSuperadminGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: approvedSuperadminUserRecord.id,
        role: "superadmin",
        status: "approved",
      });
    await superadminAndOrgAdminPb
      .collection(globalUserPermissionsCollectionName)
      .create(approvedSuperadminGlobalUserPermissionsPayload);

    const user1Pb = createPbConnection();
    const user1Payload = userPayloadBuilder.forCreateRandomData();
    const user1Record = await user1Pb.collection(usersCollectionName).create(user1Payload);

    const user1OrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        userId: user1Record.id,
        orgId: organisationRecord.id,
        role: "standard",
        status: "approved",
      });
    const user1OrganisationUserPermissionRecord = await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(user1OrganisationUserPermissionsPayload);

    await expect(
      approvedSuperadminPb
        .collection(organisationUserPermissionsCollectionName)
        .delete(user1OrganisationUserPermissionRecord.id),
    ).resolves.toBe(true);
  });
  it("PDBP-OUP-DELETE-02 — Global Superadmin (pending or blocked) cannot DELETE", async () => {
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

    const pendingSuperadminPb = createPbConnection();
    const pendingSuperadminUserPayload = userPayloadBuilder.forCreateRandomData();
    const pendingSuperadminUserRecord = await pendingSuperadminPb
      .collection(usersCollectionName)
      .create(pendingSuperadminUserPayload);
    await pendingSuperadminPb
      .collection(usersCollectionName)
      .authWithPassword(pendingSuperadminUserPayload.email, pendingSuperadminUserPayload.password);

    const pendingSuperadminGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: pendingSuperadminUserRecord.id,
        role: "superadmin",
        status: "pending",
      });
    await superadminAndOrgAdminPb
      .collection(globalUserPermissionsCollectionName)
      .create(pendingSuperadminGlobalUserPermissionsPayload);

    const blockedSuperadminPb = createPbConnection();
    const blockedSuperadminUserPayload = userPayloadBuilder.forCreateRandomData();
    const blockedSuperadminUserRecord = await blockedSuperadminPb
      .collection(usersCollectionName)
      .create(blockedSuperadminUserPayload);
    await blockedSuperadminPb
      .collection(usersCollectionName)
      .authWithPassword(blockedSuperadminUserPayload.email, blockedSuperadminUserPayload.password);

    const blockedSuperadminGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: blockedSuperadminUserRecord.id,
        role: "superadmin",
        status: "blocked",
      });
    await superadminAndOrgAdminPb
      .collection(globalUserPermissionsCollectionName)
      .create(blockedSuperadminGlobalUserPermissionsPayload);

    const user1Pb = createPbConnection();
    const user1Payload = userPayloadBuilder.forCreateRandomData();
    const user1Record = await user1Pb.collection(usersCollectionName).create(user1Payload);

    const user1OrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        userId: user1Record.id,
        orgId: organisationRecord.id,
        role: "standard",
        status: "approved",
      });
    const user1OrganisationUserPermissionRecord = await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(user1OrganisationUserPermissionsPayload);

    const testFn = (p: { pb: PocketBase }) =>
      p.pb
        .collection(organisationUserPermissionsCollectionName)
        .delete(user1OrganisationUserPermissionRecord.id);
    await expect(testFn({ pb: pendingSuperadminPb })).rejects.toThrow();
    await expect(testFn({ pb: blockedSuperadminPb })).rejects.toThrow();
    await expect(testFn({ pb: superadminAndOrgAdminPb })).resolves.toBe(true);
  });
  it("PDBP-OUP-DELETE-03 — Global Admin (approved, pending, or blocked) cannot DELETE", async () => {
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

    const approvedAdminPb = createPbConnection();
    const approvedAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const approvedAdminUserRecord = await approvedAdminPb
      .collection(usersCollectionName)
      .create(approvedAdminUserPayload);
    await approvedAdminPb
      .collection(usersCollectionName)
      .authWithPassword(approvedAdminUserPayload.email, approvedAdminUserPayload.password);

    const approvedAdminGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: approvedAdminUserRecord.id,
        role: "admin",
        status: "approved",
      });
    await superadminAndOrgAdminPb
      .collection(globalUserPermissionsCollectionName)
      .create(approvedAdminGlobalUserPermissionsPayload);

    const pendingAdminPb = createPbConnection();
    const pendingAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const pendingAdminUserRecord = await pendingAdminPb
      .collection(usersCollectionName)
      .create(pendingAdminUserPayload);
    await pendingAdminPb
      .collection(usersCollectionName)
      .authWithPassword(pendingAdminUserPayload.email, pendingAdminUserPayload.password);

    const pendingAdminGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: pendingAdminUserRecord.id,
        role: "admin",
        status: "pending",
      });
    await superadminAndOrgAdminPb
      .collection(globalUserPermissionsCollectionName)
      .create(pendingAdminGlobalUserPermissionsPayload);

    const blockedAdminPb = createPbConnection();
    const blockedAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const blockedAdminUserRecord = await blockedAdminPb
      .collection(usersCollectionName)
      .create(blockedAdminUserPayload);
    await blockedAdminPb
      .collection(usersCollectionName)
      .authWithPassword(blockedAdminUserPayload.email, blockedAdminUserPayload.password);

    const blockedAdminGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: blockedAdminUserRecord.id,
        role: "admin",
        status: "blocked",
      });
    await superadminAndOrgAdminPb
      .collection(globalUserPermissionsCollectionName)
      .create(blockedAdminGlobalUserPermissionsPayload);

    const user1Pb = createPbConnection();
    const user1Payload = userPayloadBuilder.forCreateRandomData();
    const user1Record = await user1Pb.collection(usersCollectionName).create(user1Payload);

    const user1OrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        userId: user1Record.id,
        orgId: organisationRecord.id,
        role: "standard",
        status: "approved",
      });
    const user1OrganisationUserPermissionRecord = await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(user1OrganisationUserPermissionsPayload);

    const testFn = (p: { pb: PocketBase }) =>
      p.pb
        .collection(organisationUserPermissionsCollectionName)
        .delete(user1OrganisationUserPermissionRecord.id);
    await expect(testFn({ pb: pendingAdminPb })).rejects.toThrow();
    await expect(testFn({ pb: approvedAdminPb })).rejects.toThrow();
    await expect(testFn({ pb: blockedAdminPb })).rejects.toThrow();
    await expect(testFn({ pb: superadminAndOrgAdminPb })).resolves.toBe(true);
  });
  it("PDBP-OUP-DELETE-04 — Global Standard (approved, pending, or blocked) cannot DELETE", async () => {
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

    const approvedStandardPb = createPbConnection();
    const approvedStandardUserPayload = userPayloadBuilder.forCreateRandomData();
    const approvedStandardUserRecord = await approvedStandardPb
      .collection(usersCollectionName)
      .create(approvedStandardUserPayload);
    await approvedStandardPb
      .collection(usersCollectionName)
      .authWithPassword(approvedStandardUserPayload.email, approvedStandardUserPayload.password);

    const approvedStandardGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: approvedStandardUserRecord.id,
        role: "standard",
        status: "approved",
      });
    await superadminAndOrgAdminPb
      .collection(globalUserPermissionsCollectionName)
      .create(approvedStandardGlobalUserPermissionsPayload);

    const pendingStandardPb = createPbConnection();
    const pendingStandardUserPayload = userPayloadBuilder.forCreateRandomData();
    const pendingStandardUserRecord = await pendingStandardPb
      .collection(usersCollectionName)
      .create(pendingStandardUserPayload);
    await pendingStandardPb
      .collection(usersCollectionName)
      .authWithPassword(pendingStandardUserPayload.email, pendingStandardUserPayload.password);

    const pendingStandardGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: pendingStandardUserRecord.id,
        role: "standard",
        status: "pending",
      });
    await superadminAndOrgAdminPb
      .collection(globalUserPermissionsCollectionName)
      .create(pendingStandardGlobalUserPermissionsPayload);

    const blockedStandardPb = createPbConnection();
    const blockedStandardUserPayload = userPayloadBuilder.forCreateRandomData();
    const blockedStandardUserRecord = await blockedStandardPb
      .collection(usersCollectionName)
      .create(blockedStandardUserPayload);
    await blockedStandardPb
      .collection(usersCollectionName)
      .authWithPassword(blockedStandardUserPayload.email, blockedStandardUserPayload.password);

    const blockedStandardGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: blockedStandardUserRecord.id,
        role: "admin",
        status: "blocked",
      });
    await superadminAndOrgAdminPb
      .collection(globalUserPermissionsCollectionName)
      .create(blockedStandardGlobalUserPermissionsPayload);

    const user1Pb = createPbConnection();
    const user1Payload = userPayloadBuilder.forCreateRandomData();
    const user1Record = await user1Pb.collection(usersCollectionName).create(user1Payload);

    const user1OrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        userId: user1Record.id,
        orgId: organisationRecord.id,
        role: "standard",
        status: "approved",
      });
    const user1OrganisationUserPermissionRecord = await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(user1OrganisationUserPermissionsPayload);

    const testFn = (p: { pb: PocketBase }) =>
      p.pb
        .collection(organisationUserPermissionsCollectionName)
        .delete(user1OrganisationUserPermissionRecord.id);
    await expect(testFn({ pb: approvedStandardPb })).rejects.toThrow();
    await expect(testFn({ pb: pendingStandardPb })).rejects.toThrow();
    await expect(testFn({ pb: blockedStandardPb })).rejects.toThrow();
    await expect(testFn({ pb: superadminAndOrgAdminPb })).resolves.toBe(true);
  });

  it("PDBP-OUP-DELETE-AS-MEMBER-01 — Organisation Admin (approved) can DELETE AS MEMBER", async () => {
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

    const approvedOrgAdminPb = createPbConnection();
    const approvedOrgAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const approvedOrgAdminUserRecord = await approvedOrgAdminPb
      .collection(usersCollectionName)
      .create(approvedOrgAdminUserPayload);
    await approvedOrgAdminPb
      .collection(usersCollectionName)
      .authWithPassword(approvedOrgAdminUserPayload.email, approvedOrgAdminUserPayload.password);

    const approvedAdminOrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        userId: approvedOrgAdminUserRecord.id,
        orgId: organisationRecord.id,
        role: "admin",
        status: "approved",
      });
    await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(approvedAdminOrganisationUserPermissionsPayload);

    const user1Pb = createPbConnection();
    const user1Payload = userPayloadBuilder.forCreateRandomData();
    const user1Record = await user1Pb.collection(usersCollectionName).create(user1Payload);

    const user1OrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        userId: user1Record.id,
        orgId: organisationRecord.id,
        role: "standard",
        status: "approved",
      });
    const user1OrganisationUserPermissionRecord = await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(user1OrganisationUserPermissionsPayload);

    await expect(
      approvedOrgAdminPb
        .collection(organisationUserPermissionsCollectionName)
        .delete(user1OrganisationUserPermissionRecord.id),
    ).resolves.toBe(true);
  });
  it("PDBP-OUP-DELETE-AS-MEMBER-02 — Organisation Admin (pending or blocked) cannot DELETE AS MEMBER", async () => {
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

    const pendingOrgAdminPb = createPbConnection();
    const pendingOrgAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const pendingOrgAdminUserRecord = await pendingOrgAdminPb
      .collection(usersCollectionName)
      .create(pendingOrgAdminUserPayload);
    await pendingOrgAdminPb
      .collection(usersCollectionName)
      .authWithPassword(pendingOrgAdminUserPayload.email, pendingOrgAdminUserPayload.password);

    const pendingAdminOrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        userId: pendingOrgAdminUserRecord.id,
        orgId: organisationRecord.id,
        role: "admin",
        status: "pending",
      });
    await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(pendingAdminOrganisationUserPermissionsPayload);

    const blockedOrgAdminPb = createPbConnection();
    const blockedOrgAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const blockedOrgAdminUserRecord = await blockedOrgAdminPb
      .collection(usersCollectionName)
      .create(blockedOrgAdminUserPayload);
    await blockedOrgAdminPb
      .collection(usersCollectionName)
      .authWithPassword(blockedOrgAdminUserPayload.email, blockedOrgAdminUserPayload.password);

    const blockedAdminOrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        userId: blockedOrgAdminUserRecord.id,
        orgId: organisationRecord.id,
        role: "admin",
        status: "blocked",
      });
    await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(blockedAdminOrganisationUserPermissionsPayload);

    const user1Pb = createPbConnection();
    const user1Payload = userPayloadBuilder.forCreateRandomData();
    const user1Record = await user1Pb.collection(usersCollectionName).create(user1Payload);

    const user1OrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        userId: user1Record.id,
        orgId: organisationRecord.id,
        role: "standard",
        status: "approved",
      });
    const user1OrganisationUserPermissionRecord = await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(user1OrganisationUserPermissionsPayload);

    await expect(
      pendingOrgAdminPb
        .collection(organisationUserPermissionsCollectionName)
        .delete(user1OrganisationUserPermissionRecord.id),
    ).rejects.toThrow();
    await expect(
      blockedOrgAdminPb
        .collection(organisationUserPermissionsCollectionName)
        .delete(user1OrganisationUserPermissionRecord.id),
    ).rejects.toThrow();
  });
  it("PDBP-OUP-DELETE-AS-MEMBER-03 — Organisation Standard (approved, pending, or blocked) cannot DELETE AS MEMBER", async () => {
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

    const pendingOrgAdminPb = createPbConnection();
    const pendingOrgAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const pendingOrgAdminUserRecord = await pendingOrgAdminPb
      .collection(usersCollectionName)
      .create(pendingOrgAdminUserPayload);
    await pendingOrgAdminPb
      .collection(usersCollectionName)
      .authWithPassword(pendingOrgAdminUserPayload.email, pendingOrgAdminUserPayload.password);

    const pendingAdminOrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        userId: pendingOrgAdminUserRecord.id,
        orgId: organisationRecord.id,
        role: "admin",
        status: "pending",
      });
    await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(pendingAdminOrganisationUserPermissionsPayload);

    const blockedOrgAdminPb = createPbConnection();
    const blockedOrgAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const blockedOrgAdminUserRecord = await blockedOrgAdminPb
      .collection(usersCollectionName)
      .create(blockedOrgAdminUserPayload);
    await blockedOrgAdminPb
      .collection(usersCollectionName)
      .authWithPassword(blockedOrgAdminUserPayload.email, blockedOrgAdminUserPayload.password);

    const blockedAdminOrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        userId: blockedOrgAdminUserRecord.id,
        orgId: organisationRecord.id,
        role: "admin",
        status: "blocked",
      });
    await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(blockedAdminOrganisationUserPermissionsPayload);

    const user1Pb = createPbConnection();
    const user1Payload = userPayloadBuilder.forCreateRandomData();
    const user1Record = await user1Pb.collection(usersCollectionName).create(user1Payload);

    const user1OrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        userId: user1Record.id,
        orgId: organisationRecord.id,
        role: "standard",
        status: "approved",
      });
    const user1OrganisationUserPermissionRecord = await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(user1OrganisationUserPermissionsPayload);

    await expect(
      pendingOrgAdminPb
        .collection(organisationUserPermissionsCollectionName)
        .delete(user1OrganisationUserPermissionRecord.id),
    ).rejects.toThrow();
    await expect(
      blockedOrgAdminPb
        .collection(organisationUserPermissionsCollectionName)
        .delete(user1OrganisationUserPermissionRecord.id),
    ).rejects.toThrow();
  });

  it("PDBP-OUP-DELETE-AS-NON-MEMBER-01 — Organisation Admin (approved, pending, or blocked) cannot DELETE AS NON-MEMBER", async () => {
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
    const organisation1Payload = organisationsPayloadBuilder.forCreateRandomData();
    const organisation1Record = await superadminAndOrgAdminPb
      .collection(organisationsCollectionName)
      .create(organisation1Payload);

    const organisation2Payload = organisationsPayloadBuilder.forCreateRandomData();
    const organisation2Record = await superadminAndOrgAdminPb
      .collection(organisationsCollectionName)
      .create(organisation2Payload);

    const approvedOrgAdminPb = createPbConnection();
    const approvedOrgAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const approvedOrgAdminUserRecord = await approvedOrgAdminPb
      .collection(usersCollectionName)
      .create(approvedOrgAdminUserPayload);
    await approvedOrgAdminPb
      .collection(usersCollectionName)
      .authWithPassword(approvedOrgAdminUserPayload.email, approvedOrgAdminUserPayload.password);

    const approvedAdminOrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        userId: approvedOrgAdminUserRecord.id,
        orgId: organisation1Record.id,
        role: "admin",
        status: "approved",
      });
    await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(approvedAdminOrganisationUserPermissionsPayload);

    const pendingOrgAdminPb = createPbConnection();
    const pendingOrgAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const pendingOrgAdminUserRecord = await pendingOrgAdminPb
      .collection(usersCollectionName)
      .create(pendingOrgAdminUserPayload);
    await pendingOrgAdminPb
      .collection(usersCollectionName)
      .authWithPassword(pendingOrgAdminUserPayload.email, pendingOrgAdminUserPayload.password);

    const pendingAdminOrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        userId: pendingOrgAdminUserRecord.id,
        orgId: organisation1Record.id,
        role: "admin",
        status: "pending",
      });
    await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(pendingAdminOrganisationUserPermissionsPayload);

    const blockedOrgAdminPb = createPbConnection();
    const blockedOrgAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const blockedOrgAdminUserRecord = await blockedOrgAdminPb
      .collection(usersCollectionName)
      .create(blockedOrgAdminUserPayload);
    await blockedOrgAdminPb
      .collection(usersCollectionName)
      .authWithPassword(blockedOrgAdminUserPayload.email, blockedOrgAdminUserPayload.password);

    const blockedAdminOrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        userId: blockedOrgAdminUserRecord.id,
        orgId: organisation1Record.id,
        role: "admin",
        status: "blocked",
      });
    await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(blockedAdminOrganisationUserPermissionsPayload);

    const user1Pb = createPbConnection();
    const user1Payload = userPayloadBuilder.forCreateRandomData();
    const user1Record = await user1Pb.collection(usersCollectionName).create(user1Payload);

    const user1OrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        userId: user1Record.id,
        orgId: organisation2Record.id,
        role: "standard",
        status: "approved",
      });
    const user1OrganisationUserPermissionRecord = await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(user1OrganisationUserPermissionsPayload);

    const testFn = (p: { pb: PocketBase }) =>
      p.pb
        .collection(organisationUserPermissionsCollectionName)
        .delete(user1OrganisationUserPermissionRecord.id);
    await expect(testFn({ pb: approvedOrgAdminPb })).rejects.toThrow();
    await expect(testFn({ pb: pendingOrgAdminPb })).rejects.toThrow();
    await expect(testFn({ pb: blockedOrgAdminPb })).rejects.toThrow();
    await expect(testFn({ pb: superadminAndOrgAdminPb })).resolves.toBe(true);
  });
  it("PDBP-OUP-DELETE-AS-NON-MEMBER-02 — Organisation Standard (approved, pending, or blocked) cannot DELETE AS NON-MEMBER", async () => {
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
    const organisation1Payload = organisationsPayloadBuilder.forCreateRandomData();
    const organisation1Record = await superadminAndOrgAdminPb
      .collection(organisationsCollectionName)
      .create(organisation1Payload);

    const organisation2Payload = organisationsPayloadBuilder.forCreateRandomData();
    const organisation2Record = await superadminAndOrgAdminPb
      .collection(organisationsCollectionName)
      .create(organisation2Payload);

    const approvedOrgStandardPb = createPbConnection();
    const approvedOrgStandardUserPayload = userPayloadBuilder.forCreateRandomData();
    const approvedOrgStandardUserRecord = await approvedOrgStandardPb
      .collection(usersCollectionName)
      .create(approvedOrgStandardUserPayload);
    await approvedOrgStandardPb
      .collection(usersCollectionName)
      .authWithPassword(
        approvedOrgStandardUserPayload.email,
        approvedOrgStandardUserPayload.password,
      );

    const approvedOrgStandardOrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        userId: approvedOrgStandardUserRecord.id,
        orgId: organisation1Record.id,
        role: "standard",
        status: "approved",
      });
    await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(approvedOrgStandardOrganisationUserPermissionsPayload);

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

    const pendingOrgStandardOrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        userId: pendingOrgStandardUserRecord.id,
        orgId: organisation1Record.id,
        role: "standard",
        status: "pending",
      });
    await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(pendingOrgStandardOrganisationUserPermissionsPayload);

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

    const blockedOrgStandardOrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        userId: blockedOrgStandardUserRecord.id,
        orgId: organisation1Record.id,
        role: "standard",
        status: "blocked",
      });
    await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(blockedOrgStandardOrganisationUserPermissionsPayload);

    const user1Pb = createPbConnection();
    const user1Payload = userPayloadBuilder.forCreateRandomData();
    const user1Record = await user1Pb.collection(usersCollectionName).create(user1Payload);

    const user1OrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        userId: user1Record.id,
        orgId: organisation2Record.id,
        role: "standard",
        status: "approved",
      });
    const user1OrganisationUserPermissionRecord = await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(user1OrganisationUserPermissionsPayload);

    const testFn = (p: { pb: PocketBase }) =>
      p.pb
        .collection(organisationUserPermissionsCollectionName)
        .delete(user1OrganisationUserPermissionRecord.id);
    await expect(testFn({ pb: approvedOrgStandardPb })).rejects.toThrow();
    await expect(testFn({ pb: pendingOrgStandardPb })).rejects.toThrow();
    await expect(testFn({ pb: blockedOrgStandardPb })).rejects.toThrow();
    await expect(testFn({ pb: superadminAndOrgAdminPb })).resolves.toBe(true);
  });

  it("PDBP-OUP-DELETE-OWN-01 — Organisation Admin (approved, pending, or blocked) cannot DELETE OWN", async () => {
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

    const approvedOrgAdminPb = createPbConnection();
    const approvedOrgAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const approvedOrgAdminUserRecord = await approvedOrgAdminPb
      .collection(usersCollectionName)
      .create(approvedOrgAdminUserPayload);
    await approvedOrgAdminPb
      .collection(usersCollectionName)
      .authWithPassword(approvedOrgAdminUserPayload.email, approvedOrgAdminUserPayload.password);

    const approvedAdminOrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        userId: approvedOrgAdminUserRecord.id,
        orgId: organisationRecord.id,
        role: "admin",
        status: "approved",
      });
    const approvedOrgAdminOrganisationUserPermissionRecord = await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(approvedAdminOrganisationUserPermissionsPayload);

    const pendingOrgAdminPb = createPbConnection();
    const pendingOrgAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const pendingOrgAdminUserRecord = await pendingOrgAdminPb
      .collection(usersCollectionName)
      .create(pendingOrgAdminUserPayload);
    await pendingOrgAdminPb
      .collection(usersCollectionName)
      .authWithPassword(pendingOrgAdminUserPayload.email, pendingOrgAdminUserPayload.password);

    const pendingAdminOrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        userId: pendingOrgAdminUserRecord.id,
        orgId: organisationRecord.id,
        role: "admin",
        status: "pending",
      });
    const pendingOrgAdminOrganisationUserPermissionRecord = await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(pendingAdminOrganisationUserPermissionsPayload);

    const blockedOrgAdminPb = createPbConnection();
    const blockedOrgAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const blockedOrgAdminUserRecord = await blockedOrgAdminPb
      .collection(usersCollectionName)
      .create(blockedOrgAdminUserPayload);
    await blockedOrgAdminPb
      .collection(usersCollectionName)
      .authWithPassword(blockedOrgAdminUserPayload.email, blockedOrgAdminUserPayload.password);

    const blockedAdminOrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        userId: blockedOrgAdminUserRecord.id,
        orgId: organisationRecord.id,
        role: "admin",
        status: "blocked",
      });
    const blockedOrgAdminOrganisationUserPermissionRecord = await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(blockedAdminOrganisationUserPermissionsPayload);

    await expect(
      approvedOrgAdminPb
        .collection(organisationUserPermissionsCollectionName)
        .delete(approvedOrgAdminOrganisationUserPermissionRecord.id),
    ).rejects.toThrow();
    await expect(
      pendingOrgAdminPb
        .collection(organisationUserPermissionsCollectionName)
        .delete(pendingOrgAdminOrganisationUserPermissionRecord.id),
    ).rejects.toThrow();
    await expect(
      blockedOrgAdminPb
        .collection(organisationUserPermissionsCollectionName)
        .delete(blockedOrgAdminOrganisationUserPermissionRecord.id),
    ).rejects.toThrow();
  });
  it("PDBP-OUP-DELETE-OWN-02 — Organisation Standard (approved, pending, or blocked) cannot DELETE OWN", async () => {
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

    const approvedOrgStandardPb = createPbConnection();
    const approvedOrgStandardUserPayload = userPayloadBuilder.forCreateRandomData();
    const approvedOrgStandardUserRecord = await approvedOrgStandardPb
      .collection(usersCollectionName)
      .create(approvedOrgStandardUserPayload);
    await approvedOrgStandardPb
      .collection(usersCollectionName)
      .authWithPassword(
        approvedOrgStandardUserPayload.email,
        approvedOrgStandardUserPayload.password,
      );

    const approvedOrgStandardOrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        userId: approvedOrgStandardUserRecord.id,
        orgId: organisationRecord.id,
        role: "standard",
        status: "approved",
      });
    const approvedOrgStandardOrganisationUserPermissionRecord = await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(approvedOrgStandardOrganisationUserPermissionsPayload);

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

    const pendingOrgStandardOrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        userId: pendingOrgStandardUserRecord.id,
        orgId: organisationRecord.id,
        role: "standard",
        status: "pending",
      });
    const pendingOrgStandardOrganisationUserPermissionRecord = await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(pendingOrgStandardOrganisationUserPermissionsPayload);

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

    const blockedOrgStandardOrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        userId: blockedOrgStandardUserRecord.id,
        orgId: organisationRecord.id,
        role: "admin",
        status: "blocked",
      });
    const blockedOrgStandardOrganisationUserPermissionRecord = await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(blockedOrgStandardOrganisationUserPermissionsPayload);

    await expect(
      approvedOrgStandardPb
        .collection(organisationUserPermissionsCollectionName)
        .delete(approvedOrgStandardOrganisationUserPermissionRecord.id),
    ).rejects.toThrow();
    await expect(
      pendingOrgStandardPb
        .collection(organisationUserPermissionsCollectionName)
        .delete(pendingOrgStandardOrganisationUserPermissionRecord.id),
    ).rejects.toThrow();
    await expect(
      blockedOrgStandardPb
        .collection(organisationUserPermissionsCollectionName)
        .delete(blockedOrgStandardOrganisationUserPermissionRecord.id),
    ).rejects.toThrow();
  });
});
