import {
  globalUserPermissionsCollectionName,
  globalUserPermissionsPayloadBuilder,
  organisationUserPermissionsCollectionName,
  organisationsCollectionName,
  organisationsPayloadBuilder,
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
import { usersCollectionName, userPayloadBuilder } from "@repo/pokkit-db-permissions-ts-helpers";
import { sourceTestBuildDirPath, superuserEmail, superuserPassword } from "../_constants";
import { pokkitDbPermissionsTestsMetadata } from "./_pokkitDbConfigSyncTestsMetadata";

const testMetadata =
  pokkitDbPermissionsTestsMetadata.pokkitDbPermissionsOrganisationsCollectionList;
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

  it("PDBP-ORG-LIST-01 — Global Superadmin can LIST", async () => {
    const superadminPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminPb.collection(usersCollectionName).create(superadminUserPayload);
    await superadminPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    const organisation1Payload = organisationsPayloadBuilder.forCreateRandomData();
    await superadminPb.collection(organisationsCollectionName).create(organisation1Payload);

    const organisation2Payload = organisationsPayloadBuilder.forCreateRandomData();
    await superadminPb.collection(organisationsCollectionName).create(organisation2Payload);

    const organisations = await superadminPb.collection(organisationsCollectionName).getFullList();
    expect(organisations.length).toBe(2);
  });

  it("PDBP-ORG-LIST-02 — Global Admin (approved) can LIST", async () => {
    const superadminPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminPb.collection(usersCollectionName).create(superadminUserPayload);
    await superadminPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    const organisation1Payload = organisationsPayloadBuilder.forCreateRandomData();
    await superadminPb.collection(organisationsCollectionName).create(organisation1Payload);
    const organisation2Payload = organisationsPayloadBuilder.forCreateRandomData();
    await superadminPb.collection(organisationsCollectionName).create(organisation2Payload);

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

    const organisations = await adminPb.collection(organisationsCollectionName).getFullList();
    expect(organisations.length).toBe(2);
  });

  it("PDBP-ORG-LIST-03 — Global Admin (pending or blocked) cannot LIST", async () => {
    const superadminPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminPb.collection(usersCollectionName).create(superadminUserPayload);
    await superadminPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    const organisation1Payload = organisationsPayloadBuilder.forCreateRandomData();
    await superadminPb.collection(organisationsCollectionName).create(organisation1Payload);
    const organisation2Payload = organisationsPayloadBuilder.forCreateRandomData();
    await superadminPb.collection(organisationsCollectionName).create(organisation2Payload);

    const pendingAdminPb = createPbConnection();
    const pendingAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const pendingAdminUserRecord = await pendingAdminPb
      .collection(usersCollectionName)
      .create(pendingAdminUserPayload);
    await pendingAdminPb
      .collection(usersCollectionName)
      .authWithPassword(pendingAdminUserPayload.email, pendingAdminUserPayload.password);

    const blockedAdminPb = createPbConnection();
    const blockedAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const blockedAdminUserRecord = await blockedAdminPb
      .collection(usersCollectionName)
      .create(blockedAdminUserPayload);
    await blockedAdminPb
      .collection(usersCollectionName)
      .authWithPassword(blockedAdminUserPayload.email, blockedAdminUserPayload.password);

    await superadminPb.collection(globalUserPermissionsCollectionName).create(
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: pendingAdminUserRecord.id,
        role: "admin",
        status: "pending",
      }),
    );
    await superadminPb.collection(globalUserPermissionsCollectionName).create(
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: blockedAdminUserRecord.id,
        role: "admin",
        status: "blocked",
      }),
    );

    const pendingAdminOrganisations = await pendingAdminPb
      .collection(organisationsCollectionName)
      .getFullList();
    expect(pendingAdminOrganisations.length).toBe(0);
    const blockedAdminOrganisations = await blockedAdminPb
      .collection(organisationsCollectionName)
      .getFullList();
    expect(blockedAdminOrganisations.length).toBe(0);
  });

  it("PDBP-ORG-LIST-04 — Global Standard (approved) can LIST", async () => {
    const superadminPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminPb.collection(usersCollectionName).create(superadminUserPayload);
    await superadminPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    const organisation1Payload = organisationsPayloadBuilder.forCreateRandomData();
    await superadminPb.collection(organisationsCollectionName).create(organisation1Payload);
    const organisation2Payload = organisationsPayloadBuilder.forCreateRandomData();
    await superadminPb.collection(organisationsCollectionName).create(organisation2Payload);

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

    const organisations = await standardPb.collection(organisationsCollectionName).getFullList();
    expect(organisations.length).toBe(2);
  });

  it("PDBP-ORG-LIST-05 — Global Standard (pending or blocked) cannot LIST", async () => {
    const superadminPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminPb.collection(usersCollectionName).create(superadminUserPayload);
    await superadminPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    const organisation1Payload = organisationsPayloadBuilder.forCreateRandomData();
    await superadminPb.collection(organisationsCollectionName).create(organisation1Payload);
    const organisation2Payload = organisationsPayloadBuilder.forCreateRandomData();
    await superadminPb.collection(organisationsCollectionName).create(organisation2Payload);

    const pendingStandardPb = createPbConnection();
    const pendingStandardUserPayload = userPayloadBuilder.forCreateRandomData();
    const pendingStandardUserRecord = await pendingStandardPb
      .collection(usersCollectionName)
      .create(pendingStandardUserPayload);
    await pendingStandardPb
      .collection(usersCollectionName)
      .authWithPassword(pendingStandardUserPayload.email, pendingStandardUserPayload.password);

    const blockedStandardPb = createPbConnection();
    const blockedStandardUserPayload = userPayloadBuilder.forCreateRandomData();
    const blockedStandardUserRecord = await blockedStandardPb
      .collection(usersCollectionName)
      .create(blockedStandardUserPayload);
    await blockedStandardPb
      .collection(usersCollectionName)
      .authWithPassword(blockedStandardUserPayload.email, blockedStandardUserPayload.password);

    await superadminPb.collection(globalUserPermissionsCollectionName).create(
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: pendingStandardUserRecord.id,
        role: "standard",
        status: "pending",
      }),
    );
    await superadminPb.collection(globalUserPermissionsCollectionName).create(
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: blockedStandardUserRecord.id,
        role: "standard",
        status: "blocked",
      }),
    );

    const pendingStandardOrganisations = await pendingStandardPb
      .collection(organisationsCollectionName)
      .getFullList();
    expect(pendingStandardOrganisations.length).toBe(0);
    const blockedStandardOrganisations = await blockedStandardPb
      .collection(organisationsCollectionName)
      .getFullList();
    expect(blockedStandardOrganisations.length).toBe(0);
  });

  it("PDBP-ORG-LIST-06 — Organisation Admin (approved) can LIST", async () => {
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
    const otherOrganisationPayload = organisationsPayloadBuilder.forCreateRandomData();
    await superadminPb.collection(organisationsCollectionName).create(otherOrganisationPayload);

    const pendingOrgAdminPb = createPbConnection();
    const pendingOrgAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const pendingOrgAdminUserRecord = await pendingOrgAdminPb
      .collection(usersCollectionName)
      .create(pendingOrgAdminUserPayload);
    await pendingOrgAdminPb
      .collection(usersCollectionName)
      .authWithPassword(pendingOrgAdminUserPayload.email, pendingOrgAdminUserPayload.password);

    const approvedOrgAdminPb = createPbConnection();
    const approvedOrgAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const approvedOrgAdminUserRecord = await approvedOrgAdminPb
      .collection(usersCollectionName)
      .create(approvedOrgAdminUserPayload);
    await approvedOrgAdminPb
      .collection(usersCollectionName)
      .authWithPassword(approvedOrgAdminUserPayload.email, approvedOrgAdminUserPayload.password);

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
        userId: pendingOrgAdminUserRecord.id,
        role: "admin",
        status: "pending",
      }),
    );
    await superadminPb.collection(organisationUserPermissionsCollectionName).create(
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisationRecord.id,
        userId: approvedOrgAdminUserRecord.id,
        role: "admin",
        status: "approved",
      }),
    );
    await superadminPb.collection(organisationUserPermissionsCollectionName).create(
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisationRecord.id,
        userId: blockedOrgAdminUserRecord.id,
        role: "admin",
        status: "blocked",
      }),
    );

    const approvedOrgAdminOrganisations = await approvedOrgAdminPb
      .collection(organisationsCollectionName)
      .getFullList();
    expect(approvedOrgAdminOrganisations.length).toBe(1);
    expect(approvedOrgAdminOrganisations[0]?.id).toBe(organisationRecord.id);
  });

  it("PDBP-ORG-LIST-07 — Organisation Admin (pending or blocked) can LIST", async () => {
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
    const otherOrganisationPayload = organisationsPayloadBuilder.forCreateRandomData();
    await superadminPb.collection(organisationsCollectionName).create(otherOrganisationPayload);

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

    const listOrganisationsTestFn = async ({ pb }: { pb: PocketBase }) =>
      pb.collection(organisationsCollectionName).getFullList();

    const pendingOrgAdminOrganisations = await listOrganisationsTestFn({ pb: pendingOrgAdminPb });
    expect(pendingOrgAdminOrganisations[0]).toMatchObject(organisationPayload);

    const blockedOrgAdminOrganisations = await listOrganisationsTestFn({ pb: blockedOrgAdminPb });
    expect(blockedOrgAdminOrganisations[0]).toMatchObject(organisationPayload);
  });

  it("PDBP-ORG-LIST-08 — Organisation Standard (approved) can LIST", async () => {
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
    const otherOrganisationPayload = organisationsPayloadBuilder.forCreateRandomData();
    await superadminPb.collection(organisationsCollectionName).create(otherOrganisationPayload);

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

    const organisations = await orgStandardPb.collection(organisationsCollectionName).getFullList();
    expect(organisations.length).toBe(1);
    expect(organisations[0]).toMatchObject(organisationPayload);
  });

  it("PDBP-ORG-LIST-09 — Organisation Standard (pending or blocked) cannot LIST", async () => {
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
        userId: pendingOrgStandardUserRecord.id,
        role: "standard",
        status: "pending",
      }),
    );
    await superadminPb.collection(organisationUserPermissionsCollectionName).create(
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisationRecord.id,
        userId: blockedOrgStandardUserRecord.id,
        role: "standard",
        status: "blocked",
      }),
    );

    const pendingOrgStandardOrganisations = await pendingOrgStandardPb
      .collection(organisationsCollectionName)
      .getFullList();
    expect(pendingOrgStandardOrganisations.length).toBe(0);
    const blockedOrgStandardOrganisations = await blockedOrgStandardPb
      .collection(organisationsCollectionName)
      .getFullList();
    expect(blockedOrgStandardOrganisations.length).toBe(0);
  });
});
