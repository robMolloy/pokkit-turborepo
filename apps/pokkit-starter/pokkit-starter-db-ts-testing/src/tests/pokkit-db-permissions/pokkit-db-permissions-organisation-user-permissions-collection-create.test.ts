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
  organisationsCollectionName,
  organisationsPayloadBuilder,
  organisationUserPermissionsPayloadBuilder,
  organisationUserPermissionsCollectionName,
  globalUserPermissionsPayloadBuilder,
  globalUserPermissionsCollectionName,
} from "@repo/pokkit-db-permissions-ts-helpers";

const testMetadata =
  pokkitDbPermissionsTestsMetadata.pokkitDbPermissionsOrganisationUserPermissionsCollectionCreate;
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

  it("PDBP-OUP-CREATE-01 — Global Superadmin (approved) can CREATE", async () => {
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

    const user1Pb = createPbConnection();
    const user1UserPayload = userPayloadBuilder.forCreateRandomData();
    const user1Record = await user1Pb.collection(usersCollectionName).create(user1UserPayload);
    await user1Pb
      .collection(usersCollectionName)
      .authWithPassword(user1UserPayload.email, user1UserPayload.password);

    const organisationRecord = await superadminAndOrgAdminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());

    const organisationsUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisationRecord.id,
        userId: user1Record.id,
        role: "admin",
        status: "approved",
      });
    const organisationsUserPermissionsRecord = await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(organisationsUserPermissionsPayload);
    expect(organisationsUserPermissionsRecord).toMatchObject(organisationsUserPermissionsPayload);
  });

  it("PDBP-OUP-CREATE-02 — Global Superadmin (pending or blocked) cannot CREATE", async () => {
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

    const organisationRecord = await superadminAndOrgAdminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());

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
        role: "superadmin",
        status: "pending",
      });

    await superadminAndOrgAdminPb
      .collection(globalUserPermissionsCollectionName)
      .create(pendingAdminGlobalUserPermissionsPayload);

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
        role: "superadmin",
        status: "blocked",
      });
    await superadminAndOrgAdminPb
      .collection(globalUserPermissionsCollectionName)
      .create(blockedAdminGlobalUserPermissionsPayload);

    const user1Pb = createPbConnection();
    const user1UserPayload = userPayloadBuilder.forCreateRandomData();
    const user1Record = await user1Pb.collection(usersCollectionName).create(user1UserPayload);

    const user1OrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisationRecord.id,
        userId: user1Record.id,
        role: "admin",
        status: "approved",
      });

    const testFn = (p: { pb: PocketBase }) =>
      p.pb
        .collection(organisationUserPermissionsCollectionName)
        .create(user1OrganisationUserPermissionsPayload);

    await expect(testFn({ pb: pendingAdminUserPb })).rejects.toThrow();
    await expect(testFn({ pb: blockedAdminUserPb })).rejects.toThrow();
    await expect(testFn({ pb: superadminAndOrgAdminPb })).resolves.toMatchObject(
      user1OrganisationUserPermissionsPayload,
    );
  });

  it("PDBP-OUP-CREATE-03 — Global Admin cannot CREATE", async () => {
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

    const organisationRecord = await superadminAndOrgAdminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());

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
    await superadminAndOrgAdminPb
      .collection(globalUserPermissionsCollectionName)
      .create(adminGlobalUserPermissionsPayload);

    const user1Pb = createPbConnection();
    const user1UserPayload = userPayloadBuilder.forCreateRandomData();
    const user1Record = await user1Pb.collection(usersCollectionName).create(user1UserPayload);
    await user1Pb
      .collection(usersCollectionName)
      .authWithPassword(user1UserPayload.email, user1UserPayload.password);

    const user1OrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisationRecord.id,
        userId: user1Record.id,
        role: "admin",
        status: "approved",
      });

    const testFn = (p: { pb: PocketBase }) =>
      p.pb
        .collection(organisationUserPermissionsCollectionName)
        .create(user1OrganisationUserPermissionsPayload);
    await expect(testFn({ pb: adminUserPb })).rejects.toThrow();
    await expect(testFn({ pb: superadminAndOrgAdminPb })).resolves.toMatchObject(
      user1OrganisationUserPermissionsPayload,
    );
  });

  it("PDBP-OUP-CREATE-04 — Global Standard cannot CREATE", async () => {
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

    const organisationRecord = await superadminAndOrgAdminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());

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
    await superadminAndOrgAdminPb
      .collection(globalUserPermissionsCollectionName)
      .create(standardGlobalUserPermissionsPayload);

    const user1Pb = createPbConnection();
    const user1UserPayload = userPayloadBuilder.forCreateRandomData();
    const user1Record = await user1Pb.collection(usersCollectionName).create(user1UserPayload);
    await user1Pb
      .collection(usersCollectionName)
      .authWithPassword(user1UserPayload.email, user1UserPayload.password);

    const user1OrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisationRecord.id,
        userId: user1Record.id,
        role: "admin",
        status: "approved",
      });

    const testFn = (p: { pb: PocketBase }) =>
      p.pb
        .collection(organisationUserPermissionsCollectionName)
        .create(user1OrganisationUserPermissionsPayload);
    await expect(testFn({ pb: standardUserPb })).rejects.toThrow();
    await expect(testFn({ pb: superadminAndOrgAdminPb })).resolves.toMatchObject(
      user1OrganisationUserPermissionsPayload,
    );
  });

  it("PDBP-OUP-CREATE-05 — Organisation Admin (approved) can CREATE", async () => {
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

    const organisationRecord = await superadminAndOrgAdminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());

    const orgAdminUserPb = createPbConnection();
    const orgAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const orgAdminUserRecord = await orgAdminUserPb
      .collection(usersCollectionName)
      .create(orgAdminUserPayload);
    await orgAdminUserPb
      .collection(usersCollectionName)
      .authWithPassword(orgAdminUserPayload.email, orgAdminUserPayload.password);

    const adminOrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisationRecord.id,
        userId: orgAdminUserRecord.id,
        role: "admin",
        status: "approved",
      });
    await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(adminOrganisationUserPermissionsPayload);

    const user1Pb = createPbConnection();
    const user1UserPayload = userPayloadBuilder.forCreateRandomData();
    const user1Record = await user1Pb.collection(usersCollectionName).create(user1UserPayload);
    await user1Pb
      .collection(usersCollectionName)
      .authWithPassword(user1UserPayload.email, user1UserPayload.password);

    const user1OrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisationRecord.id,
        userId: user1Record.id,
        role: "admin",
        status: "approved",
      });

    await expect(
      orgAdminUserPb
        .collection(organisationUserPermissionsCollectionName)
        .create(user1OrganisationUserPermissionsPayload),
    ).resolves.toMatchObject(user1OrganisationUserPermissionsPayload);
  });

  it("PDBP-OUP-CREATE-06 — Organisation Admin (pending or blocked) cannot CREATE", async () => {
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

    const organisationRecord = await superadminAndOrgAdminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());

    const pendingAdminUserPb = createPbConnection();
    const pendingAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const pendingAdminUserRecord = await pendingAdminUserPb
      .collection(usersCollectionName)
      .create(pendingAdminUserPayload);
    await pendingAdminUserPb
      .collection(usersCollectionName)
      .authWithPassword(pendingAdminUserPayload.email, pendingAdminUserPayload.password);

    const pendingAdminOrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisationRecord.id,
        userId: pendingAdminUserRecord.id,
        role: "admin",
        status: "pending",
      });

    await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(pendingAdminOrganisationUserPermissionsPayload);

    const blockedAdminUserPb = createPbConnection();
    const blockedAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const blockedAdminUserRecord = await blockedAdminUserPb
      .collection(usersCollectionName)
      .create(blockedAdminUserPayload);
    await blockedAdminUserPb
      .collection(usersCollectionName)
      .authWithPassword(blockedAdminUserPayload.email, blockedAdminUserPayload.password);

    const blockedAdminOrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisationRecord.id,
        userId: blockedAdminUserRecord.id,
        role: "admin",
        status: "blocked",
      });
    await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(blockedAdminOrganisationUserPermissionsPayload);

    const user1Pb = createPbConnection();
    const user1UserPayload = userPayloadBuilder.forCreateRandomData();
    const user1Record = await user1Pb.collection(usersCollectionName).create(user1UserPayload);

    const user1OrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisationRecord.id,
        userId: user1Record.id,
        role: "admin",
        status: "approved",
      });

    const testFn = (p: { pb: PocketBase }) =>
      p.pb
        .collection(organisationUserPermissionsCollectionName)
        .create(user1OrganisationUserPermissionsPayload);
    await expect(testFn({ pb: pendingAdminUserPb })).rejects.toThrow();
    await expect(testFn({ pb: blockedAdminUserPb })).rejects.toThrow();
    await expect(testFn({ pb: superadminAndOrgAdminPb })).resolves.toMatchObject(
      user1OrganisationUserPermissionsPayload,
    );
  });

  it("PDBP-OUP-CREATE-07 — Organisation Standard cannot CREATE", async () => {
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

    const organisationRecord = await superadminAndOrgAdminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());

    const standardUserPb = createPbConnection();
    const standardUserPayload = userPayloadBuilder.forCreateRandomData();
    const standardUserRecord = await standardUserPb
      .collection(usersCollectionName)
      .create(standardUserPayload);
    await standardUserPb
      .collection(usersCollectionName)
      .authWithPassword(standardUserPayload.email, standardUserPayload.password);

    const standardOrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisationRecord.id,
        userId: standardUserRecord.id,
        role: "standard",
        status: "approved",
      });
    await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(standardOrganisationUserPermissionsPayload);

    const user1Pb = createPbConnection();
    const user1UserPayload = userPayloadBuilder.forCreateRandomData();
    const user1Record = await user1Pb.collection(usersCollectionName).create(user1UserPayload);
    await user1Pb
      .collection(usersCollectionName)
      .authWithPassword(user1UserPayload.email, user1UserPayload.password);

    const user1OrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisationRecord.id,
        userId: user1Record.id,
        role: "admin",
        status: "approved",
      });

    const testFn = (p: { pb: PocketBase }) =>
      p.pb
        .collection(organisationUserPermissionsCollectionName)
        .create(user1OrganisationUserPermissionsPayload);
    await expect(testFn({ pb: standardUserPb })).rejects.toThrow();
    await expect(testFn({ pb: superadminAndOrgAdminPb })).resolves.toMatchObject(
      user1OrganisationUserPermissionsPayload,
    );
  });
});
