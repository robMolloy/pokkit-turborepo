import {
  globalUserPermissionsCollectionName,
  globalUserPermissionsPayloadBuilder,
  organisationsCollectionName,
  organisationsPayloadBuilder,
  organisationUserPermissionsCollectionName,
  organisationUserPermissionsPayloadBuilder,
  userPayloadBuilder,
  usersCollectionName,
} from "@repo/pokkit-db-permissions-ts-helpers";
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
  pokkitDbPermissionsTestsMetadata.pokkitDbPermissionsOrganisationUserPermissionsCollectionView;
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

  it("PDBP-OUP-VIEW-01 — Global Superadmin (approved) can VIEW", async () => {
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
    const user1UserPayload = userPayloadBuilder.forCreateRandomData();
    const user1UserRecord = await user1Pb.collection(usersCollectionName).create(user1UserPayload);
    await user1Pb
      .collection(usersCollectionName)
      .authWithPassword(user1UserPayload.email, user1UserPayload.password);
    const user1OrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisationRecord.id,
        userId: user1UserRecord.id,
        role: "admin",
        status: "approved",
      });
    const user1OrganisationUserPermissionRecord = await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(user1OrganisationUserPermissionsPayload);

    const testFn = async (p: { pb: PocketBase }) =>
      p.pb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(user1OrganisationUserPermissionRecord.id);
    await expect(testFn({ pb: superadminAndOrgAdminPb })).resolves.toMatchObject(
      user1OrganisationUserPermissionRecord,
    );
    await expect(testFn({ pb: approvedSuperadminPb })).resolves.toMatchObject(
      user1OrganisationUserPermissionRecord,
    );
  });
  it("PDBP-OUP-VIEW-02 — Global Superadmin (pending or blocked) cannot VIEW", async () => {
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
    const user1UserPayload = userPayloadBuilder.forCreateRandomData();
    const user1UserRecord = await user1Pb.collection(usersCollectionName).create(user1UserPayload);
    await user1Pb
      .collection(usersCollectionName)
      .authWithPassword(user1UserPayload.email, user1UserPayload.password);
    const user1OrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisationRecord.id,
        userId: user1UserRecord.id,
        role: "admin",
        status: "approved",
      });
    const user1OrganisationUserPermissionRecord = await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(user1OrganisationUserPermissionsPayload);

    const testFn = async (p: { pb: PocketBase }) =>
      p.pb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(user1OrganisationUserPermissionRecord.id);
    await expect(testFn({ pb: superadminAndOrgAdminPb })).resolves.toMatchObject(
      user1OrganisationUserPermissionRecord,
    );
    await expect(testFn({ pb: pendingSuperadminPb })).rejects.toThrow();
    await expect(testFn({ pb: blockedSuperadminPb })).rejects.toThrow();
  });
  it("PDBP-OUP-VIEW-03 — Global Admin (approved) can VIEW", async () => {
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

    const user1Pb = createPbConnection();
    const user1UserPayload = userPayloadBuilder.forCreateRandomData();
    const user1UserRecord = await user1Pb.collection(usersCollectionName).create(user1UserPayload);
    await user1Pb
      .collection(usersCollectionName)
      .authWithPassword(user1UserPayload.email, user1UserPayload.password);
    const user1OrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisationRecord.id,
        userId: user1UserRecord.id,
        role: "admin",
        status: "approved",
      });
    const user1OrganisationUserPermissionRecord = await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(user1OrganisationUserPermissionsPayload);

    const testFn = async (p: { pb: PocketBase }) =>
      p.pb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(user1OrganisationUserPermissionRecord.id);
    await expect(testFn({ pb: superadminAndOrgAdminPb })).resolves.toMatchObject(
      user1OrganisationUserPermissionRecord,
    );
    await expect(testFn({ pb: approvedAdminPb })).resolves.toMatchObject(
      user1OrganisationUserPermissionRecord,
    );
  });
  it("PDBP-OUP-VIEW-04 — Global Admin (pending or blocked) cannot VIEW", async () => {
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
    const user1UserPayload = userPayloadBuilder.forCreateRandomData();
    const user1UserRecord = await user1Pb.collection(usersCollectionName).create(user1UserPayload);
    await user1Pb
      .collection(usersCollectionName)
      .authWithPassword(user1UserPayload.email, user1UserPayload.password);
    const user1OrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisationRecord.id,
        userId: user1UserRecord.id,
        role: "admin",
        status: "approved",
      });
    const user1OrganisationUserPermissionRecord = await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(user1OrganisationUserPermissionsPayload);

    const testFn = async (p: { pb: PocketBase }) =>
      p.pb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(user1OrganisationUserPermissionRecord.id);
    await expect(testFn({ pb: superadminAndOrgAdminPb })).resolves.toMatchObject(
      user1OrganisationUserPermissionRecord,
    );
    await expect(testFn({ pb: pendingAdminPb })).rejects.toThrow();
    await expect(testFn({ pb: blockedAdminPb })).rejects.toThrow();
  });
  it("PDBP-OUP-VIEW-05 — Global Standard (approved) can VIEW", async () => {
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

    const user1Pb = createPbConnection();
    const user1UserPayload = userPayloadBuilder.forCreateRandomData();
    const user1UserRecord = await user1Pb.collection(usersCollectionName).create(user1UserPayload);
    await user1Pb
      .collection(usersCollectionName)
      .authWithPassword(user1UserPayload.email, user1UserPayload.password);
    const user1OrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisationRecord.id,
        userId: user1UserRecord.id,
        role: "admin",
        status: "approved",
      });
    const user1OrganisationUserPermissionRecord = await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(user1OrganisationUserPermissionsPayload);

    const testFn = async (p: { pb: PocketBase }) =>
      p.pb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(user1OrganisationUserPermissionRecord.id);
    await expect(testFn({ pb: superadminAndOrgAdminPb })).resolves.toMatchObject(
      user1OrganisationUserPermissionRecord,
    );
    await expect(testFn({ pb: approvedStandardPb })).resolves.toMatchObject(
      user1OrganisationUserPermissionRecord,
    );
  });
  it("PDBP-OUP-VIEW-06 — Global Standard (pending or blocked) cannot VIEW", async () => {
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
        role: "standard",
        status: "blocked",
      });
    await superadminAndOrgAdminPb
      .collection(globalUserPermissionsCollectionName)
      .create(blockedStandardGlobalUserPermissionsPayload);

    const user1Pb = createPbConnection();
    const user1UserPayload = userPayloadBuilder.forCreateRandomData();
    const user1UserRecord = await user1Pb.collection(usersCollectionName).create(user1UserPayload);
    await user1Pb
      .collection(usersCollectionName)
      .authWithPassword(user1UserPayload.email, user1UserPayload.password);
    const user1OrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisationRecord.id,
        userId: user1UserRecord.id,
        role: "admin",
        status: "approved",
      });
    const user1OrganisationUserPermissionRecord = await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(user1OrganisationUserPermissionsPayload);

    const testFn = async (p: { pb: PocketBase }) =>
      p.pb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(user1OrganisationUserPermissionRecord.id);
    await expect(testFn({ pb: superadminAndOrgAdminPb })).resolves.toMatchObject(
      user1OrganisationUserPermissionRecord,
    );
    await expect(testFn({ pb: pendingStandardPb })).rejects.toThrow();
    await expect(testFn({ pb: blockedStandardPb })).rejects.toThrow();
  });

  it("PDBP-OUP-VIEW-AS-MEMBER-01 — Organisation Admin (approved) can VIEW AS MEMBER", async () => {
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
    const approvedOrgAdminOrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        userId: approvedOrgAdminUserRecord.id,
        orgId: organisationRecord.id,
        role: "admin",
        status: "approved",
      });
    await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(approvedOrgAdminOrganisationUserPermissionsPayload);

    const user1Pb = createPbConnection();
    const user1UserPayload = userPayloadBuilder.forCreateRandomData();
    const user1UserRecord = await user1Pb.collection(usersCollectionName).create(user1UserPayload);
    await user1Pb
      .collection(usersCollectionName)
      .authWithPassword(user1UserPayload.email, user1UserPayload.password);
    const user1OrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisationRecord.id,
        userId: user1UserRecord.id,
        role: "admin",
        status: "approved",
      });
    const user1OrganisationUserPermissionRecord = await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(user1OrganisationUserPermissionsPayload);

    const testFn = async (p: { pb: PocketBase }) =>
      p.pb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(user1OrganisationUserPermissionRecord.id);
    await expect(testFn({ pb: superadminAndOrgAdminPb })).resolves.toMatchObject(
      user1OrganisationUserPermissionRecord,
    );
    await expect(testFn({ pb: approvedOrgAdminPb })).resolves.toMatchObject(
      user1OrganisationUserPermissionRecord,
    );
  });
  it("PDBP-OUP-VIEW-AS-MEMBER-02 — Organisation Admin (pending or blocked) cannot VIEW AS MEMBER", async () => {
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
    const pendingOrgAdminOrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        userId: pendingOrgAdminUserRecord.id,
        orgId: organisationRecord.id,
        role: "admin",
        status: "pending",
      });
    await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(pendingOrgAdminOrganisationUserPermissionsPayload);

    const blockedOrgAdminPb = createPbConnection();
    const blockedOrgAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const blockedOrgAdminUserRecord = await blockedOrgAdminPb
      .collection(usersCollectionName)
      .create(blockedOrgAdminUserPayload);
    await blockedOrgAdminPb
      .collection(usersCollectionName)
      .authWithPassword(blockedOrgAdminUserPayload.email, blockedOrgAdminUserPayload.password);
    const blockedOrgAdminOrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        userId: blockedOrgAdminUserRecord.id,
        orgId: organisationRecord.id,
        role: "admin",
        status: "blocked",
      });
    await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(blockedOrgAdminOrganisationUserPermissionsPayload);

    const user1Pb = createPbConnection();
    const user1UserPayload = userPayloadBuilder.forCreateRandomData();
    const user1UserRecord = await user1Pb.collection(usersCollectionName).create(user1UserPayload);
    await user1Pb
      .collection(usersCollectionName)
      .authWithPassword(user1UserPayload.email, user1UserPayload.password);
    const user1OrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisationRecord.id,
        userId: user1UserRecord.id,
        role: "admin",
        status: "approved",
      });
    const user1OrganisationUserPermissionRecord = await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(user1OrganisationUserPermissionsPayload);

    const testFn = async (p: { pb: PocketBase }) =>
      p.pb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(user1OrganisationUserPermissionRecord.id);
    await expect(testFn({ pb: superadminAndOrgAdminPb })).resolves.toMatchObject(
      user1OrganisationUserPermissionRecord,
    );
    await expect(testFn({ pb: pendingOrgAdminPb })).rejects.toThrow();
    await expect(testFn({ pb: blockedOrgAdminPb })).rejects.toThrow();
  });
  it("PDBP-OUP-VIEW-AS-MEMBER-03 — Organisation Standard (approved) can VIEW AS MEMBER", async () => {
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
    await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(approvedOrgStandardOrganisationUserPermissionsPayload);

    const user1Pb = createPbConnection();
    const user1UserPayload = userPayloadBuilder.forCreateRandomData();
    const user1UserRecord = await user1Pb.collection(usersCollectionName).create(user1UserPayload);
    await user1Pb
      .collection(usersCollectionName)
      .authWithPassword(user1UserPayload.email, user1UserPayload.password);
    const user1OrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisationRecord.id,
        userId: user1UserRecord.id,
        role: "admin",
        status: "approved",
      });
    const user1OrganisationUserPermissionRecord = await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(user1OrganisationUserPermissionsPayload);

    const testFn = async (p: { pb: PocketBase }) =>
      p.pb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(user1OrganisationUserPermissionRecord.id);
    await expect(testFn({ pb: superadminAndOrgAdminPb })).resolves.toMatchObject(
      user1OrganisationUserPermissionRecord,
    );
    await expect(testFn({ pb: approvedOrgStandardPb })).resolves.toMatchObject(
      user1OrganisationUserPermissionRecord,
    );
  });
  it("PDBP-OUP-VIEW-AS-MEMBER-04 — Organisation Standard (pending or blocked) cannot VIEW AS MEMBER", async () => {
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
        orgId: organisationRecord.id,
        role: "standard",
        status: "blocked",
      });
    await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(blockedOrgStandardOrganisationUserPermissionsPayload);

    const user1Pb = createPbConnection();
    const user1UserPayload = userPayloadBuilder.forCreateRandomData();
    const user1UserRecord = await user1Pb.collection(usersCollectionName).create(user1UserPayload);
    await user1Pb
      .collection(usersCollectionName)
      .authWithPassword(user1UserPayload.email, user1UserPayload.password);
    const user1OrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisationRecord.id,
        userId: user1UserRecord.id,
        role: "admin",
        status: "approved",
      });
    const user1OrganisationUserPermissionRecord = await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(user1OrganisationUserPermissionsPayload);

    const testFn = async (p: { pb: PocketBase }) =>
      p.pb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(user1OrganisationUserPermissionRecord.id);
    await expect(testFn({ pb: superadminAndOrgAdminPb })).resolves.toMatchObject(
      user1OrganisationUserPermissionRecord,
    );
    await expect(testFn({ pb: pendingOrgStandardPb })).rejects.toThrow();
    await expect(testFn({ pb: blockedOrgStandardPb })).rejects.toThrow();
  });

  it("PDBP-OUP-VIEW-AS-NON-MEMBER-01 — Organisation Admin (approved, pending, or blocked) cannot VIEW AS NON-MEMBER", async () => {
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

    const approvedOrg1AdminPb = createPbConnection();
    const approvedOrg1AdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const approvedOrg1AdminUserRecord = await approvedOrg1AdminPb
      .collection(usersCollectionName)
      .create(approvedOrg1AdminUserPayload);
    await approvedOrg1AdminPb
      .collection(usersCollectionName)
      .authWithPassword(approvedOrg1AdminUserPayload.email, approvedOrg1AdminUserPayload.password);
    const approvedOrg1AdminOrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        userId: approvedOrg1AdminUserRecord.id,
        orgId: organisation1Record.id,
        role: "admin",
        status: "approved",
      });
    await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(approvedOrg1AdminOrganisationUserPermissionsPayload);

    const pendingOrg1AdminPb = createPbConnection();
    const pendingOrg1AdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const pendingOrg1AdminUserRecord = await pendingOrg1AdminPb
      .collection(usersCollectionName)
      .create(pendingOrg1AdminUserPayload);
    await pendingOrg1AdminPb
      .collection(usersCollectionName)
      .authWithPassword(pendingOrg1AdminUserPayload.email, pendingOrg1AdminUserPayload.password);
    const pendingOrg1AdminOrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        userId: pendingOrg1AdminUserRecord.id,
        orgId: organisation1Record.id,
        role: "admin",
        status: "pending",
      });
    await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(pendingOrg1AdminOrganisationUserPermissionsPayload);

    const blockedOrg1AdminPb = createPbConnection();
    const blockedOrg1AdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const blockedOrg1AdminUserRecord = await blockedOrg1AdminPb
      .collection(usersCollectionName)
      .create(blockedOrg1AdminUserPayload);
    await blockedOrg1AdminPb
      .collection(usersCollectionName)
      .authWithPassword(blockedOrg1AdminUserPayload.email, blockedOrg1AdminUserPayload.password);
    const blockedOrg1AdminOrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        userId: blockedOrg1AdminUserRecord.id,
        orgId: organisation1Record.id,
        role: "admin",
        status: "blocked",
      });
    await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(blockedOrg1AdminOrganisationUserPermissionsPayload);

    const pendingOrg2AdminPb = createPbConnection();
    const pendingOrg2AdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const pendingOrg2AdminUserRecord = await pendingOrg2AdminPb
      .collection(usersCollectionName)
      .create(pendingOrg2AdminUserPayload);
    await pendingOrg2AdminPb
      .collection(usersCollectionName)
      .authWithPassword(pendingOrg2AdminUserPayload.email, pendingOrg2AdminUserPayload.password);
    const pendingOrg2AdminOrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        userId: pendingOrg2AdminUserRecord.id,
        orgId: organisation2Record.id,
        role: "admin",
        status: "approved",
      });
    const pendingOrg2AdminOrganisationUserPermissionRecord = await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(pendingOrg2AdminOrganisationUserPermissionsPayload);

    const testFn = async (p: { pb: PocketBase }) =>
      p.pb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(pendingOrg2AdminOrganisationUserPermissionRecord.id);

    await expect(testFn({ pb: approvedOrg1AdminPb })).rejects.toThrow();
    await expect(testFn({ pb: pendingOrg1AdminPb })).rejects.toThrow();
    await expect(testFn({ pb: blockedOrg1AdminPb })).rejects.toThrow();

    await expect(testFn({ pb: pendingOrg2AdminPb })).resolves.toMatchObject(
      pendingOrg2AdminOrganisationUserPermissionRecord,
    );
    await expect(testFn({ pb: superadminAndOrgAdminPb })).resolves.toMatchObject(
      pendingOrg2AdminOrganisationUserPermissionRecord,
    );
  });
  it("PDBP-OUP-VIEW-AS-NON-MEMBER-02 — Organisation Standard (approved, pending, or blocked) cannot VIEW AS NON-MEMBER", async () => {
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

    const approvedOrg1StandardPb = createPbConnection();
    const approvedOrg1StandardUserPayload = userPayloadBuilder.forCreateRandomData();
    const approvedOrg1StandardUserRecord = await approvedOrg1StandardPb
      .collection(usersCollectionName)
      .create(approvedOrg1StandardUserPayload);
    await approvedOrg1StandardPb
      .collection(usersCollectionName)
      .authWithPassword(
        approvedOrg1StandardUserPayload.email,
        approvedOrg1StandardUserPayload.password,
      );
    const approvedOrg1StandardOrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        userId: approvedOrg1StandardUserRecord.id,
        orgId: organisation1Record.id,
        role: "standard",
        status: "approved",
      });
    await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(approvedOrg1StandardOrganisationUserPermissionsPayload);

    const pendingOrg1StandardPb = createPbConnection();
    const pendingOrg1StandardUserPayload = userPayloadBuilder.forCreateRandomData();
    const pendingOrg1StandardUserRecord = await pendingOrg1StandardPb
      .collection(usersCollectionName)
      .create(pendingOrg1StandardUserPayload);
    await pendingOrg1StandardPb
      .collection(usersCollectionName)
      .authWithPassword(
        pendingOrg1StandardUserPayload.email,
        pendingOrg1StandardUserPayload.password,
      );
    const pendingOrg1StandardOrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        userId: pendingOrg1StandardUserRecord.id,
        orgId: organisation1Record.id,
        role: "admin",
        status: "pending",
      });
    await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(pendingOrg1StandardOrganisationUserPermissionsPayload);

    const blockedOrg1StandardPb = createPbConnection();
    const blockedOrg1StandardUserPayload = userPayloadBuilder.forCreateRandomData();
    const blockedOrg1StandardUserRecord = await blockedOrg1StandardPb
      .collection(usersCollectionName)
      .create(blockedOrg1StandardUserPayload);
    await blockedOrg1StandardPb
      .collection(usersCollectionName)
      .authWithPassword(
        blockedOrg1StandardUserPayload.email,
        blockedOrg1StandardUserPayload.password,
      );
    const blockedOrg1StandardOrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        userId: blockedOrg1StandardUserRecord.id,
        orgId: organisation1Record.id,
        role: "standard",
        status: "blocked",
      });
    await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(blockedOrg1StandardOrganisationUserPermissionsPayload);

    const pendingOrg2StandardPb = createPbConnection();
    const pendingOrg2StandardUserPayload = userPayloadBuilder.forCreateRandomData();
    const pendingOrg2StandardUserRecord = await pendingOrg2StandardPb
      .collection(usersCollectionName)
      .create(pendingOrg2StandardUserPayload);
    await pendingOrg2StandardPb
      .collection(usersCollectionName)
      .authWithPassword(
        pendingOrg2StandardUserPayload.email,
        pendingOrg2StandardUserPayload.password,
      );
    const pendingOrg2StandardOrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        userId: pendingOrg2StandardUserRecord.id,
        orgId: organisation2Record.id,
        role: "standard",
        status: "approved",
      });
    const pendingOrg2StandardOrganisationUserPermissionRecord = await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(pendingOrg2StandardOrganisationUserPermissionsPayload);

    const testFn = async (p: { pb: PocketBase }) =>
      p.pb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(pendingOrg2StandardOrganisationUserPermissionRecord.id);

    await expect(testFn({ pb: approvedOrg1StandardPb })).rejects.toThrow();
    await expect(testFn({ pb: pendingOrg1StandardPb })).rejects.toThrow();
    await expect(testFn({ pb: blockedOrg1StandardPb })).rejects.toThrow();

    await expect(testFn({ pb: pendingOrg2StandardPb })).resolves.toMatchObject(
      pendingOrg2StandardOrganisationUserPermissionRecord,
    );
    await expect(testFn({ pb: superadminAndOrgAdminPb })).resolves.toMatchObject(
      pendingOrg2StandardOrganisationUserPermissionRecord,
    );
  });

  it("PDBP-OUP-VIEW-OWN-01 — Organisation Admin (approved, pending, or blocked) can VIEW OWN", async () => {
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
    const approvedOrgAdminOrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        userId: approvedOrgAdminUserRecord.id,
        orgId: organisationRecord.id,
        role: "admin",
        status: "approved",
      });
    const approvedOrgAdminOrganisationUserPermissionRecord = await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(approvedOrgAdminOrganisationUserPermissionsPayload);

    const pendingOrgAdminPb = createPbConnection();
    const pendingOrgAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const pendingOrgAdminUserRecord = await pendingOrgAdminPb
      .collection(usersCollectionName)
      .create(pendingOrgAdminUserPayload);
    await pendingOrgAdminPb
      .collection(usersCollectionName)
      .authWithPassword(pendingOrgAdminUserPayload.email, pendingOrgAdminUserPayload.password);
    const pendingOrgAdminOrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        userId: pendingOrgAdminUserRecord.id,
        orgId: organisationRecord.id,
        role: "admin",
        status: "pending",
      });
    const pendingOrgAdminOrganisationUserPermissionRecord = await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(pendingOrgAdminOrganisationUserPermissionsPayload);

    const blockedOrgAdminPb = createPbConnection();
    const blockedOrgAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const blockedOrgAdminUserRecord = await blockedOrgAdminPb
      .collection(usersCollectionName)
      .create(blockedOrgAdminUserPayload);
    await blockedOrgAdminPb
      .collection(usersCollectionName)
      .authWithPassword(blockedOrgAdminUserPayload.email, blockedOrgAdminUserPayload.password);
    const blockedOrgAdminOrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        userId: blockedOrgAdminUserRecord.id,
        orgId: organisationRecord.id,
        role: "admin",
        status: "blocked",
      });
    const blockedOrgAdminOrganisationUserPermissionRecord = await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(blockedOrgAdminOrganisationUserPermissionsPayload);

    await expect(
      approvedOrgAdminPb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(approvedOrgAdminOrganisationUserPermissionRecord.id),
    ).resolves.toMatchObject(approvedOrgAdminOrganisationUserPermissionRecord);

    await expect(
      pendingOrgAdminPb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(pendingOrgAdminOrganisationUserPermissionRecord.id),
    ).resolves.toMatchObject(pendingOrgAdminOrganisationUserPermissionRecord);

    await expect(
      blockedOrgAdminPb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(blockedOrgAdminOrganisationUserPermissionRecord.id),
    ).resolves.toMatchObject(blockedOrgAdminOrganisationUserPermissionRecord);
  });
  it("PDBP-OUP-VIEW-OWN-02 — Organisation Standard (approved, pending, or blocked) can VIEW OWN", async () => {
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
        role: "standard",
        status: "blocked",
      });
    const blockedOrgStandardOrganisationUserPermissionRecord = await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(blockedOrgStandardOrganisationUserPermissionsPayload);

    await expect(
      approvedOrgStandardPb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(approvedOrgStandardOrganisationUserPermissionRecord.id),
    ).resolves.toMatchObject(approvedOrgStandardOrganisationUserPermissionRecord);

    await expect(
      pendingOrgStandardPb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(pendingOrgStandardOrganisationUserPermissionRecord.id),
    ).resolves.toMatchObject(pendingOrgStandardOrganisationUserPermissionRecord);

    await expect(
      blockedOrgStandardPb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(blockedOrgStandardOrganisationUserPermissionRecord.id),
    ).resolves.toMatchObject(blockedOrgStandardOrganisationUserPermissionRecord);
  });
});
