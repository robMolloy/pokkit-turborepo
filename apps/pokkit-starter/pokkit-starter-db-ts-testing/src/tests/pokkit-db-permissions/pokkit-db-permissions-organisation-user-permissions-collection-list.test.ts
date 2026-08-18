import {
  createUserAndPermissions,
  globalUserPermissionsCollectionName,
  globalUserPermissionsPayloadBuilder,
  organisationsCollectionName,
  organisationsPayloadBuilder,
  organisationUserPermissionsCollectionName,
  organisationUserPermissionsPayloadBuilder,
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
import { userPayloadBuilder } from "@repo/pokkit-db-permissions-ts-helpers";
import { sourceTestBuildDirPath, superuserEmail, superuserPassword } from "../_constants";
import { pokkitDbPermissionsTestsMetadata } from "./_pokkitDbConfigSyncTestsMetadata";
import { usersCollectionName } from "@repo/pokkit-db-permissions-ts-helpers";

const testMetadata =
  pokkitDbPermissionsTestsMetadata.pokkitDbPermissionsOrganisationUserPermissionsCollectionList;
const testSuiteName = testMetadata.name;

const pbPortNumber = testMetadata.portNumber;
const pbDirPath = `_sandboxes/${testSuiteName}`;
const pbFilePath = getPbFilePath({ pbDirPath });
const pbServeUrl = getPbServeUrl({ pbPortNumber });
const logFilePath = `_logs/${testSuiteName}`;

const createPbConnection = () => {
  const pb = new PocketBase(pbServeUrl);
  pb.autoCancellation(false);
  return pb;
};

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

  it("PDBP-OUP-LIST-01 — Global Superadmin (approved) can LIST", async () => {
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
    await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(user1OrganisationUserPermissionsPayload);

    const testFn = async (p: { pb: PocketBase }) =>
      p.pb.collection(organisationUserPermissionsCollectionName).getFullList();
    await expect(testFn({ pb: superadminAndOrgAdminPb })).resolves.toHaveLength(2);
    await expect(testFn({ pb: approvedSuperadminPb })).resolves.toHaveLength(2);
  });
  it("PDBP-OUP-LIST-02 — Global Superadmin (pending or blocked) cannot LIST", async () => {
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
    await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(user1OrganisationUserPermissionsPayload);

    const testFn = async (p: { pb: PocketBase }) =>
      p.pb.collection(organisationUserPermissionsCollectionName).getFullList();
    await expect(testFn({ pb: pendingSuperadminPb })).resolves.toHaveLength(0);
    await expect(testFn({ pb: blockedSuperadminPb })).resolves.toHaveLength(0);
    await expect(testFn({ pb: superadminAndOrgAdminPb })).resolves.toHaveLength(2);
  });
  it("PDBP-OUP-LIST-03 — Global Admin (approved) can LIST", async () => {
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
    await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(user1OrganisationUserPermissionsPayload);

    const testFn = async (p: { pb: PocketBase }) =>
      p.pb.collection(organisationUserPermissionsCollectionName).getFullList();
    await expect(testFn({ pb: superadminAndOrgAdminPb })).resolves.toHaveLength(2);
    await expect(testFn({ pb: approvedAdminPb })).resolves.toHaveLength(2);
  });
  it("PDBP-OUP-LIST-04 — Global Admin (pending or blocked) cannot LIST", async () => {
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
    await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(user1OrganisationUserPermissionsPayload);

    const testFn = async (p: { pb: PocketBase }) =>
      p.pb.collection(organisationUserPermissionsCollectionName).getFullList();
    await expect(testFn({ pb: pendingAdminPb })).resolves.toHaveLength(0);
    await expect(testFn({ pb: blockedAdminPb })).resolves.toHaveLength(0);
    await expect(testFn({ pb: superadminAndOrgAdminPb })).resolves.toHaveLength(2);
  });
  it("PDBP-OUP-LIST-05 — Global Standard (approved) can LIST", async () => {
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
    await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(user1OrganisationUserPermissionsPayload);

    const testFn = async (p: { pb: PocketBase }) =>
      p.pb.collection(organisationUserPermissionsCollectionName).getFullList();
    await expect(testFn({ pb: superadminAndOrgAdminPb })).resolves.toHaveLength(2);
    await expect(testFn({ pb: approvedStandardPb })).resolves.toHaveLength(2);
  });
  it("PDBP-OUP-LIST-06 — Global Standard (pending or blocked) cannot LIST", async () => {
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
    await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(user1OrganisationUserPermissionsPayload);

    const testFn = async (p: { pb: PocketBase }) =>
      p.pb.collection(organisationUserPermissionsCollectionName).getFullList();
    await expect(testFn({ pb: pendingStandardPb })).resolves.toHaveLength(0);
    await expect(testFn({ pb: blockedStandardPb })).resolves.toHaveLength(0);
    await expect(testFn({ pb: superadminAndOrgAdminPb })).resolves.toHaveLength(2);
  });

  it("PDBP-OUP-LIST-AS-MEMBER-01 — Organisation Admin (approved) can LIST AS MEMBER", async () => {
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
        userId: user1UserRecord.id,
        orgId: organisationRecord.id,
        role: "standard",
        status: "pending",
      });
    await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(user1OrganisationUserPermissionsPayload);

    const testFn = async (p: { pb: PocketBase }) =>
      p.pb.collection(organisationUserPermissionsCollectionName).getFullList();
    await expect(testFn({ pb: superadminAndOrgAdminPb })).resolves.toHaveLength(3);
    await expect(testFn({ pb: approvedOrgAdminPb })).resolves.toHaveLength(3);
  });

  it("PDBP-OUP-LIST-AS-MEMBER-02 — Organisation Admin (pending or blocked) cannot LIST AS MEMBER", async () => {
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
        userId: user1UserRecord.id,
        orgId: organisationRecord.id,
        role: "standard",
        status: "pending",
      });
    await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(user1OrganisationUserPermissionsPayload);

    const testFn = async (p: { pb: PocketBase }) =>
      p.pb.collection(organisationUserPermissionsCollectionName).getFullList();
    await expect(testFn({ pb: superadminAndOrgAdminPb })).resolves.toHaveLength(4);
    await expect(testFn({ pb: pendingOrgAdminPb })).resolves.toHaveLength(1);
    await expect(testFn({ pb: blockedOrgAdminPb })).resolves.toHaveLength(1);
  });
  it("PDBP-OUP-LIST-AS-MEMBER-03 — Organisation Standard (approved) can LIST AS MEMBER", async () => {
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
        userId: user1UserRecord.id,
        orgId: organisationRecord.id,
        role: "standard",
        status: "pending",
      });
    await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(user1OrganisationUserPermissionsPayload);

    const testFn = async (p: { pb: PocketBase }) =>
      p.pb.collection(organisationUserPermissionsCollectionName).getFullList();
    await expect(testFn({ pb: superadminAndOrgAdminPb })).resolves.toHaveLength(3);
    await expect(testFn({ pb: approvedOrgStandardPb })).resolves.toHaveLength(3);
  });

  it("PDBP-OUP-LIST-AS-MEMBER-04 — Organisation Standard (pending or blocked) cannot LIST AS MEMBER", async () => {
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
        userId: user1UserRecord.id,
        orgId: organisationRecord.id,
        role: "standard",
        status: "pending",
      });
    await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(user1OrganisationUserPermissionsPayload);

    const testFn = async (p: { pb: PocketBase }) =>
      p.pb.collection(organisationUserPermissionsCollectionName).getFullList();
    await expect(testFn({ pb: superadminAndOrgAdminPb })).resolves.toHaveLength(4);
    await expect(testFn({ pb: pendingOrgStandardPb })).resolves.toHaveLength(1);
    await expect(testFn({ pb: blockedOrgStandardPb })).resolves.toHaveLength(1);
  });

  it("PDBP-OUP-LIST-AS-NON-MEMBER-01 — Organisation Admin (approved, pending, or blocked) cannot LIST AS NON-MEMBER", async () => {
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

    const approvedOrg2AdminPb = createPbConnection();
    const approvedOrg2AdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const approvedOrg2AdminUserRecord = await approvedOrg2AdminPb
      .collection(usersCollectionName)
      .create(approvedOrg2AdminUserPayload);
    await approvedOrg2AdminPb
      .collection(usersCollectionName)
      .authWithPassword(approvedOrg2AdminUserPayload.email, approvedOrg2AdminUserPayload.password);
    const approvedOrg2AdminOrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        userId: approvedOrg2AdminUserRecord.id,
        orgId: organisation2Record.id,
        role: "admin",
        status: "approved",
      });
    await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(approvedOrg2AdminOrganisationUserPermissionsPayload);

    const testFn = async (p: { pb: PocketBase }) =>
      p.pb.collection(organisationUserPermissionsCollectionName).getFullList();
    await expect(testFn({ pb: superadminAndOrgAdminPb })).resolves.toHaveLength(6);
    await expect(testFn({ pb: approvedOrg1AdminPb })).resolves.toHaveLength(4);
    await expect(testFn({ pb: pendingOrg1AdminPb })).resolves.toHaveLength(1);
    await expect(testFn({ pb: blockedOrg1AdminPb })).resolves.toHaveLength(1);
    await expect(testFn({ pb: approvedOrg2AdminPb })).resolves.toHaveLength(2);
  });

  it("PDBP-OUP-LIST-AS-NON-MEMBER-02 — Organisation Standard (approved, pending, or blocked) cannot LIST AS NON-MEMBER", async () => {
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

    const approvedStandardPb = createPbConnection();
    const approvedStandardUserPayload = userPayloadBuilder.forCreateRandomData();
    const approvedStandardUserRecord = await approvedStandardPb
      .collection(usersCollectionName)
      .create(approvedStandardUserPayload);
    await approvedStandardPb
      .collection(usersCollectionName)
      .authWithPassword(approvedStandardUserPayload.email, approvedStandardUserPayload.password);
    const approvedStandardOrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        userId: approvedStandardUserRecord.id,
        orgId: organisation1Record.id,
        role: "standard",
        status: "approved",
      });
    await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(approvedStandardOrganisationUserPermissionsPayload);

    const pendingStandardPb = createPbConnection();
    const pendingStandardUserPayload = userPayloadBuilder.forCreateRandomData();
    const pendingStandardUserRecord = await pendingStandardPb
      .collection(usersCollectionName)
      .create(pendingStandardUserPayload);
    await pendingStandardPb
      .collection(usersCollectionName)
      .authWithPassword(pendingStandardUserPayload.email, pendingStandardUserPayload.password);
    const pendingStandardOrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        userId: pendingStandardUserRecord.id,
        orgId: organisation1Record.id,
        role: "standard",
        status: "pending",
      });
    await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(pendingStandardOrganisationUserPermissionsPayload);

    const blockedStandardPb = createPbConnection();
    const blockedStandardUserPayload = userPayloadBuilder.forCreateRandomData();
    const blockedStandardUserRecord = await blockedStandardPb
      .collection(usersCollectionName)
      .create(blockedStandardUserPayload);
    await blockedStandardPb
      .collection(usersCollectionName)
      .authWithPassword(blockedStandardUserPayload.email, blockedStandardUserPayload.password);
    const blockedStandardOrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        userId: blockedStandardUserRecord.id,
        orgId: organisation1Record.id,
        role: "standard",
        status: "blocked",
      });
    await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(blockedStandardOrganisationUserPermissionsPayload);

    const approvedOrg2StandardPb = createPbConnection();
    const approvedOrg2StandardUserPayload = userPayloadBuilder.forCreateRandomData();
    const approvedOrg2StandardUserRecord = await approvedOrg2StandardPb
      .collection(usersCollectionName)
      .create(approvedOrg2StandardUserPayload);
    await approvedOrg2StandardPb
      .collection(usersCollectionName)
      .authWithPassword(
        approvedOrg2StandardUserPayload.email,
        approvedOrg2StandardUserPayload.password,
      );
    const approvedOrg2StandardOrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        userId: approvedOrg2StandardUserRecord.id,
        orgId: organisation2Record.id,
        role: "standard",
        status: "approved",
      });
    await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(approvedOrg2StandardOrganisationUserPermissionsPayload);

    const testFn = async (p: { pb: PocketBase }) =>
      p.pb.collection(organisationUserPermissionsCollectionName).getFullList();
    await expect(testFn({ pb: superadminAndOrgAdminPb })).resolves.toHaveLength(6);
    await expect(testFn({ pb: approvedStandardPb })).resolves.toHaveLength(4);
    await expect(testFn({ pb: pendingStandardPb })).resolves.toHaveLength(1);
    await expect(testFn({ pb: blockedStandardPb })).resolves.toHaveLength(1);
    await expect(testFn({ pb: approvedOrg2StandardPb })).resolves.toHaveLength(2);
  });

  it("PDBP-OUP-LIST-OWN-01 — Organisation Admin (approved, pending, or blocked) can LIST OWN", async () => {
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

    const approvedOrg2AdminPb = createPbConnection();
    const approvedOrg2AdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const approvedOrg2AdminUserRecord = await approvedOrg2AdminPb
      .collection(usersCollectionName)
      .create(approvedOrg2AdminUserPayload);
    await approvedOrg2AdminPb
      .collection(usersCollectionName)
      .authWithPassword(approvedOrg2AdminUserPayload.email, approvedOrg2AdminUserPayload.password);
    const approvedOrg2AdminOrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        userId: approvedOrg2AdminUserRecord.id,
        orgId: organisation2Record.id,
        role: "admin",
        status: "approved",
      });
    await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(approvedOrg2AdminOrganisationUserPermissionsPayload);

    const testFn = async (p: { pb: PocketBase }) =>
      p.pb.collection(organisationUserPermissionsCollectionName).getFullList();
    await expect(testFn({ pb: superadminAndOrgAdminPb })).resolves.toHaveLength(6);
    await expect(testFn({ pb: approvedOrg1AdminPb })).resolves.toHaveLength(4);
    await expect(testFn({ pb: pendingOrg1AdminPb })).resolves.toHaveLength(1);
    await expect(testFn({ pb: blockedOrg1AdminPb })).resolves.toHaveLength(1);
    await expect(testFn({ pb: approvedOrg2AdminPb })).resolves.toHaveLength(2);
  });
  it("PDBP-OUP-LIST-OWN-02 — Organisation Standard (approved, pending, or blocked) can LIST OWN", async () => {
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

    const approvedStandardPb = createPbConnection();
    const approvedStandardUserPayload = userPayloadBuilder.forCreateRandomData();
    const approvedStandardUserRecord = await approvedStandardPb
      .collection(usersCollectionName)
      .create(approvedStandardUserPayload);
    await approvedStandardPb
      .collection(usersCollectionName)
      .authWithPassword(approvedStandardUserPayload.email, approvedStandardUserPayload.password);
    const approvedStandardOrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        userId: approvedStandardUserRecord.id,
        orgId: organisation1Record.id,
        role: "standard",
        status: "approved",
      });
    await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(approvedStandardOrganisationUserPermissionsPayload);

    const pendingStandardPb = createPbConnection();
    const pendingStandardUserPayload = userPayloadBuilder.forCreateRandomData();
    const pendingStandardUserRecord = await pendingStandardPb
      .collection(usersCollectionName)
      .create(pendingStandardUserPayload);
    await pendingStandardPb
      .collection(usersCollectionName)
      .authWithPassword(pendingStandardUserPayload.email, pendingStandardUserPayload.password);
    const pendingStandardOrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        userId: pendingStandardUserRecord.id,
        orgId: organisation1Record.id,
        role: "standard",
        status: "pending",
      });
    await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(pendingStandardOrganisationUserPermissionsPayload);

    const blockedStandardPb = createPbConnection();
    const blockedStandardUserPayload = userPayloadBuilder.forCreateRandomData();
    const blockedStandardUserRecord = await blockedStandardPb
      .collection(usersCollectionName)
      .create(blockedStandardUserPayload);
    await blockedStandardPb
      .collection(usersCollectionName)
      .authWithPassword(blockedStandardUserPayload.email, blockedStandardUserPayload.password);
    const blockedStandardOrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        userId: blockedStandardUserRecord.id,
        orgId: organisation1Record.id,
        role: "standard",
        status: "blocked",
      });
    await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(blockedStandardOrganisationUserPermissionsPayload);

    const approvedOrg2StandardPb = createPbConnection();
    const approvedOrg2StandardUserPayload = userPayloadBuilder.forCreateRandomData();
    const approvedOrg2StandardUserRecord = await approvedOrg2StandardPb
      .collection(usersCollectionName)
      .create(approvedOrg2StandardUserPayload);
    await approvedOrg2StandardPb
      .collection(usersCollectionName)
      .authWithPassword(
        approvedOrg2StandardUserPayload.email,
        approvedOrg2StandardUserPayload.password,
      );
    const approvedOrg2StandardOrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        userId: approvedOrg2StandardUserRecord.id,
        orgId: organisation2Record.id,
        role: "standard",
        status: "approved",
      });
    await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(approvedOrg2StandardOrganisationUserPermissionsPayload);

    const testFn = async (p: { pb: PocketBase }) =>
      p.pb.collection(organisationUserPermissionsCollectionName).getFullList();
    await expect(testFn({ pb: superadminAndOrgAdminPb })).resolves.toHaveLength(6);
    await expect(testFn({ pb: approvedStandardPb })).resolves.toHaveLength(4);
    await expect(testFn({ pb: pendingStandardPb })).resolves.toHaveLength(1);
    await expect(testFn({ pb: blockedStandardPb })).resolves.toHaveLength(1);
    await expect(testFn({ pb: approvedOrg2StandardPb })).resolves.toHaveLength(2);
  });

  it("PDBP-OUP-LIST-01 — Global Superadmin (approved) can LIST", async () => {
    const superadminPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminPb.collection(usersCollectionName).create(superadminUserPayload);
    await superadminPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    const organisationRecord = await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());

    const superadmin2Pb = createPbConnection();
    const superadmin2UserPayload = userPayloadBuilder.forCreateRandomData();
    const superadmin2UserRecord = await superadmin2Pb
      .collection(usersCollectionName)
      .create(superadmin2UserPayload);
    await superadmin2Pb
      .collection(usersCollectionName)
      .authWithPassword(superadmin2UserPayload.email, superadmin2UserPayload.password);
    const superadmin2GlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: superadmin2UserRecord.id,
        role: "superadmin",
        status: "approved",
      });
    await superadminPb
      .collection(globalUserPermissionsCollectionName)
      .create(superadmin2GlobalUserPermissionsPayload);

    const user1Pb = createPbConnection();
    const user1UserPayload = userPayloadBuilder.forCreateRandomData();
    const user1UserRecord = await user1Pb.collection(usersCollectionName).create(user1UserPayload);
    await user1Pb
      .collection(usersCollectionName)
      .authWithPassword(user1UserPayload.email, user1UserPayload.password);

    await superadminPb.collection(organisationUserPermissionsCollectionName).create(
      organisationUserPermissionsPayloadBuilder.forCreateData({
        userId: user1UserRecord.id,
        orgId: organisationRecord.id,
        role: "admin",
        status: "approved",
      }),
    );

    const organisationUserPermissionRecords = await superadmin2Pb
      .collection(organisationUserPermissionsCollectionName)
      .getFullList();
    expect(organisationUserPermissionRecords.length).toBe(2);
  });

  it("PDBP-OUP-LIST-02 — Global Superadmin (pending or blocked) cannot LIST", async () => {
    const superadminPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminPb.collection(usersCollectionName).create(superadminUserPayload);
    await superadminPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());

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
    await superadminPb
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
    await superadminPb
      .collection(globalUserPermissionsCollectionName)
      .create(blockedSuperadminGlobalUserPermissionsPayload);

    const testFn = async (p: { pb: PocketBase }) =>
      p.pb.collection(organisationUserPermissionsCollectionName).getFullList();

    await expect(testFn({ pb: pendingSuperadminPb })).resolves.toHaveLength(0);
    await expect(testFn({ pb: blockedSuperadminPb })).resolves.toHaveLength(0);
    await expect(testFn({ pb: superadminPb })).resolves.toHaveLength(1);
  });

  it("PDBP-OUP-LIST-03 — Global Admin (approved) can LIST", async () => {
    const superadminPb = createPbConnection();
    await createUserAndPermissions({
      user: { toBeActionedByPb: superadminPb, payload: userPayloadBuilder.forCreateRandomData() },
    });

    const organisationRecord = await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());

    const adminPb = createPbConnection();
    await createUserAndPermissions({
      user: { toBeActionedByPb: adminPb, payload: userPayloadBuilder.forCreateRandomData() },
      globalUserPermissions: {
        toBeActionedByPb: superadminPb,
        payload: { role: "admin", status: "approved" },
      },
    });

    const user1Pb = createPbConnection();
    await createUserAndPermissions({
      user: { toBeActionedByPb: user1Pb, payload: userPayloadBuilder.forCreateRandomData() },
      organisationUserPermissions: [
        {
          toBeActionedByPb: superadminPb,
          payload: { orgId: organisationRecord.id, role: "admin", status: "approved" },
        },
      ],
    });

    const organisationUserPermissionRecords = await adminPb
      .collection(organisationUserPermissionsCollectionName)
      .getFullList();
    expect(organisationUserPermissionRecords.length).toBe(2);
  });

  it("PDBP-OUP-LIST-04 — Global Admin (pending or blocked) cannot LIST", async () => {
    const superadminPb = createPbConnection();
    await createUserAndPermissions({
      user: { toBeActionedByPb: superadminPb, payload: userPayloadBuilder.forCreateRandomData() },
    });

    const organisationRecord = await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());

    const pendingAdminPb = createPbConnection();
    await createUserAndPermissions({
      user: { toBeActionedByPb: pendingAdminPb, payload: userPayloadBuilder.forCreateRandomData() },
      globalUserPermissions: {
        toBeActionedByPb: superadminPb,
        payload: { role: "admin", status: "pending" },
      },
    });
    const blockedAdminPb = createPbConnection();
    await createUserAndPermissions({
      user: { toBeActionedByPb: blockedAdminPb, payload: userPayloadBuilder.forCreateRandomData() },
      globalUserPermissions: {
        toBeActionedByPb: superadminPb,
        payload: { role: "admin", status: "blocked" },
      },
    });

    const user1Pb = createPbConnection();
    await createUserAndPermissions({
      user: { toBeActionedByPb: user1Pb, payload: userPayloadBuilder.forCreateRandomData() },
      organisationUserPermissions: [
        {
          toBeActionedByPb: superadminPb,
          payload: { orgId: organisationRecord.id, role: "admin", status: "approved" },
        },
      ],
    });

    const testFn = async (p: { pb: PocketBase }) =>
      p.pb.collection(organisationUserPermissionsCollectionName).getFullList();

    expect((await testFn({ pb: pendingAdminPb })).length).toBe(0);
    expect((await testFn({ pb: blockedAdminPb })).length).toBe(0);
    expect((await testFn({ pb: superadminPb })).length).toBe(2);
  });

  it("PDBP-OUP-LIST-05 — Global Standard (approved) can LIST", async () => {
    const superadminPb = createPbConnection();
    await createUserAndPermissions({
      user: { toBeActionedByPb: superadminPb, payload: userPayloadBuilder.forCreateRandomData() },
    });

    const organisationRecord = await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());

    const standardPb = createPbConnection();
    await createUserAndPermissions({
      user: { toBeActionedByPb: standardPb, payload: userPayloadBuilder.forCreateRandomData() },
      globalUserPermissions: {
        toBeActionedByPb: superadminPb,
        payload: { role: "standard", status: "approved" },
      },
    });

    const user1Pb = createPbConnection();
    await createUserAndPermissions({
      user: { toBeActionedByPb: user1Pb, payload: userPayloadBuilder.forCreateRandomData() },
      organisationUserPermissions: [
        {
          toBeActionedByPb: superadminPb,
          payload: { orgId: organisationRecord.id, role: "admin", status: "approved" },
        },
      ],
    });

    const testFn = async (p: { pb: PocketBase }) =>
      p.pb.collection(organisationUserPermissionsCollectionName).getFullList();

    await expect(testFn({ pb: standardPb })).resolves.toHaveLength(2);
    await expect(testFn({ pb: superadminPb })).resolves.toHaveLength(2);
  });

  it("PDBP-OUP-LIST-06 — Global Standard (pending or blocked) cannot LIST", async () => {
    const superadminPb = createPbConnection();
    await createUserAndPermissions({
      user: { toBeActionedByPb: superadminPb, payload: userPayloadBuilder.forCreateRandomData() },
    });

    const organisationRecord = await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());

    const pendingStandardPb = createPbConnection();
    await createUserAndPermissions({
      user: {
        toBeActionedByPb: pendingStandardPb,
        payload: userPayloadBuilder.forCreateRandomData(),
      },
      globalUserPermissions: {
        toBeActionedByPb: superadminPb,
        payload: { role: "standard", status: "pending" },
      },
    });

    const blockedStandardPb = createPbConnection();
    await createUserAndPermissions({
      user: {
        toBeActionedByPb: blockedStandardPb,
        payload: userPayloadBuilder.forCreateRandomData(),
      },
      globalUserPermissions: {
        toBeActionedByPb: superadminPb,
        payload: { role: "standard", status: "blocked" },
      },
    });

    const user1Pb = createPbConnection();
    await createUserAndPermissions({
      user: { toBeActionedByPb: user1Pb, payload: userPayloadBuilder.forCreateRandomData() },
      organisationUserPermissions: [
        {
          toBeActionedByPb: superadminPb,
          payload: { orgId: organisationRecord.id, role: "admin", status: "approved" },
        },
      ],
    });

    const testFn = async (p: { pb: PocketBase }) =>
      p.pb.collection(organisationUserPermissionsCollectionName).getFullList();

    await expect(testFn({ pb: pendingStandardPb })).resolves.toHaveLength(0);
    await expect(testFn({ pb: blockedStandardPb })).resolves.toHaveLength(0);
    await expect(testFn({ pb: superadminPb })).resolves.toHaveLength(2);
  });

  it("PDBP-OUP-LIST-07 — Organisation Admin (approved) can LIST", async () => {
    const superadminPb = createPbConnection();
    await createUserAndPermissions({
      user: { toBeActionedByPb: superadminPb, payload: userPayloadBuilder.forCreateRandomData() },
    });

    const organisationRecord = await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());

    const orgAdminPb = createPbConnection();
    await createUserAndPermissions({
      user: { toBeActionedByPb: orgAdminPb, payload: userPayloadBuilder.forCreateRandomData() },
      organisationUserPermissions: [
        {
          toBeActionedByPb: superadminPb,
          payload: { orgId: organisationRecord.id, role: "admin", status: "approved" },
        },
      ],
    });

    await expect(
      orgAdminPb.collection(organisationUserPermissionsCollectionName).getFullList(),
    ).resolves.toHaveLength(2);
  });

  it("PDBP-OUP-LIST-08 — Organisation Admin (pending or blocked) cannot LIST", async () => {
    const superadminPb = createPbConnection();
    await createUserAndPermissions({
      user: { toBeActionedByPb: superadminPb, payload: userPayloadBuilder.forCreateRandomData() },
    });

    const organisationRecord = await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());

    const pendingOrgAdminPb = createPbConnection();
    await createUserAndPermissions({
      user: {
        toBeActionedByPb: pendingOrgAdminPb,
        payload: userPayloadBuilder.forCreateRandomData(),
      },
      organisationUserPermissions: [
        {
          toBeActionedByPb: superadminPb,
          payload: { orgId: organisationRecord.id, role: "admin", status: "pending" },
        },
      ],
    });
    const blockedOrgAdminPb = createPbConnection();
    await createUserAndPermissions({
      user: {
        toBeActionedByPb: blockedOrgAdminPb,
        payload: userPayloadBuilder.forCreateRandomData(),
      },
      organisationUserPermissions: [
        {
          toBeActionedByPb: superadminPb,
          payload: { orgId: organisationRecord.id, role: "admin", status: "blocked" },
        },
      ],
    });

    const testFn = async (p: { pb: PocketBase }) =>
      p.pb.collection(organisationUserPermissionsCollectionName).getFullList();

    await expect(testFn({ pb: pendingOrgAdminPb })).resolves.toHaveLength(1);
    await expect(testFn({ pb: blockedOrgAdminPb })).resolves.toHaveLength(1);
    await expect(testFn({ pb: superadminPb })).resolves.toHaveLength(3);
  });

  it("PDBP-OUP-LIST-09 — Organisation Standard (approved) can LIST", async () => {
    const superadminPb = createPbConnection();
    await createUserAndPermissions({
      user: { toBeActionedByPb: superadminPb, payload: userPayloadBuilder.forCreateRandomData() },
    });

    const organisation1Record = await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());
    const organisation2Record = await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());

    const org1StandardMember1Pb = createPbConnection();
    await createUserAndPermissions({
      user: {
        toBeActionedByPb: org1StandardMember1Pb,
        payload: userPayloadBuilder.forCreateRandomData(),
      },
      organisationUserPermissions: [
        {
          toBeActionedByPb: superadminPb,
          payload: { orgId: organisation1Record.id, role: "standard", status: "approved" },
        },
      ],
    });

    const org1StandardMember2Pb = createPbConnection();
    await createUserAndPermissions({
      user: {
        toBeActionedByPb: org1StandardMember2Pb,
        payload: userPayloadBuilder.forCreateRandomData(),
      },
      organisationUserPermissions: [
        {
          toBeActionedByPb: superadminPb,
          payload: { orgId: organisation1Record.id, role: "standard", status: "approved" },
        },
      ],
    });

    const org2StandardMember1Pb = createPbConnection();
    await createUserAndPermissions({
      user: {
        toBeActionedByPb: org2StandardMember1Pb,
        payload: userPayloadBuilder.forCreateRandomData(),
      },
      organisationUserPermissions: [
        {
          toBeActionedByPb: superadminPb,
          payload: { orgId: organisation2Record.id, role: "standard", status: "approved" },
        },
      ],
    });

    await expect(
      org1StandardMember1Pb.collection(organisationUserPermissionsCollectionName).getFullList(),
    ).resolves.toHaveLength(3);
    await expect(
      org1StandardMember2Pb.collection(organisationUserPermissionsCollectionName).getFullList(),
    ).resolves.toHaveLength(3);
    await expect(
      org2StandardMember1Pb.collection(organisationUserPermissionsCollectionName).getFullList(),
    ).resolves.toHaveLength(2);
  });

  it("PDBP-OUP-LIST-10 — Organisation Standard (pending or blocked) cannot LIST", async () => {
    const superadminPb = createPbConnection();
    await createUserAndPermissions({
      user: { toBeActionedByPb: superadminPb, payload: userPayloadBuilder.forCreateRandomData() },
    });

    const organisationRecord = await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());

    const pendingOrgStandardPb = createPbConnection();
    await createUserAndPermissions({
      user: {
        toBeActionedByPb: pendingOrgStandardPb,
        payload: userPayloadBuilder.forCreateRandomData(),
      },
      organisationUserPermissions: [
        {
          toBeActionedByPb: superadminPb,
          payload: { orgId: organisationRecord.id, role: "admin", status: "pending" },
        },
      ],
    });

    const blockedOrgStandardPb = createPbConnection();
    await createUserAndPermissions({
      user: {
        toBeActionedByPb: blockedOrgStandardPb,
        payload: userPayloadBuilder.forCreateRandomData(),
      },
      organisationUserPermissions: [
        {
          toBeActionedByPb: superadminPb,
          payload: { orgId: organisationRecord.id, role: "admin", status: "blocked" },
        },
      ],
    });

    const testFn = async (p: { pb: PocketBase }) =>
      p.pb.collection(organisationUserPermissionsCollectionName).getFullList();

    await expect(testFn({ pb: pendingOrgStandardPb })).resolves.toHaveLength(1);
    await expect(testFn({ pb: blockedOrgStandardPb })).resolves.toHaveLength(1);
    await expect(testFn({ pb: superadminPb })).resolves.toHaveLength(3);
  });

  it("PDBP-OUP-LIST-OWN-01 — Organisation Admin can LIST OWN", async () => {
    const superadminPb = createPbConnection();
    await createUserAndPermissions({
      user: { toBeActionedByPb: superadminPb, payload: userPayloadBuilder.forCreateRandomData() },
    });

    const organisation1Record = await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());
    const organisation2Record = await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());
    const organisation3Record = await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());
    const organisation4Record = await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());

    const approvedOrgAdminPb = createPbConnection();
    await createUserAndPermissions({
      user: {
        toBeActionedByPb: approvedOrgAdminPb,
        payload: userPayloadBuilder.forCreateRandomData(),
      },
      organisationUserPermissions: [
        {
          toBeActionedByPb: superadminPb,
          payload: { orgId: organisation1Record.id, role: "admin", status: "approved" },
        },
        {
          toBeActionedByPb: superadminPb,
          payload: { orgId: organisation2Record.id, role: "admin", status: "approved" },
        },
      ],
    });
    const pendingOrgAdminPb = createPbConnection();
    await createUserAndPermissions({
      user: {
        toBeActionedByPb: pendingOrgAdminPb,
        payload: userPayloadBuilder.forCreateRandomData(),
      },
      organisationUserPermissions: [
        {
          toBeActionedByPb: superadminPb,
          payload: { orgId: organisation3Record.id, role: "admin", status: "pending" },
        },
      ],
    });
    const blockedOrgAdminPb = createPbConnection();
    await createUserAndPermissions({
      user: {
        toBeActionedByPb: blockedOrgAdminPb,
        payload: userPayloadBuilder.forCreateRandomData(),
      },
      organisationUserPermissions: [
        {
          toBeActionedByPb: superadminPb,
          payload: { orgId: organisation4Record.id, role: "admin", status: "blocked" },
        },
      ],
    });
    const testFn = async (p: { pb: PocketBase }) =>
      p.pb.collection(organisationUserPermissionsCollectionName).getFullList();

    await expect(testFn({ pb: approvedOrgAdminPb })).resolves.toHaveLength(4);
    await expect(testFn({ pb: pendingOrgAdminPb })).resolves.toHaveLength(1);
    await expect(testFn({ pb: blockedOrgAdminPb })).resolves.toHaveLength(1);
    await expect(testFn({ pb: superadminPb })).resolves.toHaveLength(8);
  });
  it("PDBP-OUP-LIST-OWN-02 — Organisation Standard can LIST OWN", async () => {
    const superadminPb = createPbConnection();
    await createUserAndPermissions({
      user: { toBeActionedByPb: superadminPb, payload: userPayloadBuilder.forCreateRandomData() },
    });

    const organisation1Record = await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());
    const organisation2Record = await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());
    const organisation3Record = await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());
    const organisation4Record = await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());

    const approvedOrgStandardPb = createPbConnection();
    await createUserAndPermissions({
      user: {
        toBeActionedByPb: approvedOrgStandardPb,
        payload: userPayloadBuilder.forCreateRandomData(),
      },
      organisationUserPermissions: [
        {
          toBeActionedByPb: superadminPb,
          payload: { orgId: organisation1Record.id, role: "standard", status: "approved" },
        },
        {
          toBeActionedByPb: superadminPb,
          payload: { orgId: organisation2Record.id, role: "standard", status: "approved" },
        },
      ],
    });
    const pendingOrgStandardPb = createPbConnection();
    await createUserAndPermissions({
      user: {
        toBeActionedByPb: pendingOrgStandardPb,
        payload: userPayloadBuilder.forCreateRandomData(),
      },
      organisationUserPermissions: [
        {
          toBeActionedByPb: superadminPb,
          payload: { orgId: organisation3Record.id, role: "standard", status: "pending" },
        },
      ],
    });
    const blockedOrgStandardPb = createPbConnection();
    await createUserAndPermissions({
      user: {
        toBeActionedByPb: blockedOrgStandardPb,
        payload: userPayloadBuilder.forCreateRandomData(),
      },
      organisationUserPermissions: [
        {
          toBeActionedByPb: superadminPb,
          payload: { orgId: organisation4Record.id, role: "standard", status: "blocked" },
        },
      ],
    });
    const testFn = async (p: { pb: PocketBase }) =>
      p.pb.collection(organisationUserPermissionsCollectionName).getFullList();

    await expect(testFn({ pb: approvedOrgStandardPb })).resolves.toHaveLength(4);
    await expect(testFn({ pb: pendingOrgStandardPb })).resolves.toHaveLength(1);
    await expect(testFn({ pb: blockedOrgStandardPb })).resolves.toHaveLength(1);
    await expect(testFn({ pb: superadminPb })).resolves.toHaveLength(8);
  });
});
