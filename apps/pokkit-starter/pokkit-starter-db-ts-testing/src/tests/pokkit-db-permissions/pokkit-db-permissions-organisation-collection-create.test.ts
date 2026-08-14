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
import { userPayloadBuilder } from "../../utils/pocketbaseUserHelpers";
import {
  globalUserPermissionsPayloadBuilder,
  organisationsPayloadBuilder,
  organisationUserPermissionsCollectionName,
  organisationsUserPermissionsPayloadBuilder,
  organisationsCollectionName,
  globalUserPermissionsCollectionName,
} from "@repo/pokkit-db-permissions-ts-helpers";

const testMetadata =
  pokkitDbPermissionsTestsMetadata.pokkitDbPermissionsOrganisationsCollectionCreate;
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

  it("PDBP-ORG-CREATE-01 — Global Superadmin can CREATE", async () => {
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

    expect(createdOrganisationRecord).toMatchObject(organisationPayload);
  });

  it("PDBP-ORG-CREATE-02 — Global Admin cannot CREATE", async () => {
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

    const createOrganisationTestFn = (p: { pb: PocketBase }) =>
      p.pb.collection(organisationsCollectionName).create(organisationPayload);

    await expect(createOrganisationTestFn({ pb: adminPb })).rejects.toThrow();
    await expect(createOrganisationTestFn({ pb: superadminPb })).resolves.toMatchObject(
      organisationPayload,
    );
  });

  it("PDBP-ORG-CREATE-03 — Global Standard cannot CREATE", async () => {
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

    const createOrganisationTestFn = (p: { pb: PocketBase }) =>
      p.pb.collection(organisationsCollectionName).create(organisationPayload);

    await expect(createOrganisationTestFn({ pb: standardPb })).rejects.toThrow();
    await expect(createOrganisationTestFn({ pb: superadminPb })).resolves.toMatchObject(
      organisationPayload,
    );
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
      organisationsUserPermissionsPayloadBuilder.forCreateData({
        organisationId: organisationRecord.id,
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
  // it("PDBP-ORG-DELETE-05 — Organisation Admin (pending or blocked) cannot DELETE", async () => {});
  // it("PDBP-ORG-DELETE-06 — Organisation Standard cannot DELETE", async () => {});

  // it("PDBP-ORG-LIST-01 — Global Superadmin can LIST", async () => {});
  // it("PDBP-ORG-LIST-02 — Global Admin can LIST", async () => {});
  // it("PDBP-ORG-LIST-03 — Global Standard can LIST", async () => {});
  // it("PDBP-ORG-LIST-04 — Organisation Admin can LIST", async () => {});
  // it("PDBP-ORG-LIST-05 — Organisation Standard can LIST", async () => {});

  // it("PDBP-ORG-UPDATE-01 — Global Superadmin can UPDATE", async () => {});
  // it("PDBP-ORG-UPDATE-02 — Global Admin cannot UPDATE", async () => {});
  // it("PDBP-ORG-UPDATE-03 — Global Standard cannot UPDATE", async () => {});
  // it("PDBP-ORG-UPDATE-04 — Organisation Admin (approved) can UPDATE", async () => {});
  // it("PDBP-ORG-UPDATE-05 — Organisation Admin (pending or blocked) cannot UPDATE", async () => {});
  // it("PDBP-ORG-UPDATE-06 — Organisation Standard cannot UPDATE", async () => {});

  // it("PDBP-ORG-SETUP-01 — Verify collection presence and validity is setup correctly", async () => {});
  // it("PDBP-ORG-SETUP-02 — First user created is given approved admin in organisationUserPermissions", async () => {});
  // it("PDBP-ORG-SETUP-03 — Organisation creator is provisioned as approved admin for the new organisation", async () => {});

  // it("PDBP-ORG-VIEW-01 — Global Superadmin can VIEW", async () => {});
  // it("PDBP-ORG-VIEW-02 — Global Admin can VIEW", async () => {});
  // it("PDBP-ORG-VIEW-03 — Global Standard can VIEW", async () => {});
  // it("PDBP-ORG-VIEW-04 — Organisation Admin can VIEW", async () => {});
  // it("PDBP-ORG-VIEW-05 — Organisation Standard can VIEW", async () => {});

  // it("PDBP-ORG-ISOLATION-CREATE-OTHER-01 — Organisation Admin (approved) cannot CREATE other org", async () => {});
  // it("PDBP-ORG-ISOLATION-UPDATE-OTHER-01 — Organisation Admin (approved) cannot UPDATE other org", async () => {});
  // it("PDBP-ORG-ISOLATION-DELETE-OTHER-01 — Organisation Admin (approved) cannot DELETE other org", async () => {});
});
