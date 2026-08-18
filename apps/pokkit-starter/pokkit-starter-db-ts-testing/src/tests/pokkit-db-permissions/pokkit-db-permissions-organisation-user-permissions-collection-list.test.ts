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
