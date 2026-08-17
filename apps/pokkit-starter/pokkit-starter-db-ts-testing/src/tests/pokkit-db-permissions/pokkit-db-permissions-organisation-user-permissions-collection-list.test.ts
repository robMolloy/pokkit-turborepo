import {
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
  usersCollectionName,
} from "@repo/pokkit-testing";
import fse from "fs-extra";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PocketBase } from "../../config/pocketbaseConfig";
import { userPayloadBuilder } from "@repo/pokkit-db-permissions-ts-helpers";
import { sourceTestBuildDirPath, superuserEmail, superuserPassword } from "../_constants";
import { pokkitDbPermissionsTestsMetadata } from "./_pokkitDbConfigSyncTestsMetadata";

const testMetadata =
  pokkitDbPermissionsTestsMetadata.pokkitDbPermissionsOrganisationUserPermissionsCollectionList;
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

    const organisationRecord = await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());

    const pendingSuperadmin2Pb = createPbConnection();
    const pendingSuperadmin2UserPayload = userPayloadBuilder.forCreateRandomData();
    const pendingSuperadmin2UserRecord = await pendingSuperadmin2Pb
      .collection(usersCollectionName)
      .create(pendingSuperadmin2UserPayload);
    await pendingSuperadmin2Pb
      .collection(usersCollectionName)
      .authWithPassword(
        pendingSuperadmin2UserPayload.email,
        pendingSuperadmin2UserPayload.password,
      );
    const pendingSuperadmin2GlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: pendingSuperadmin2UserRecord.id,
        role: "superadmin",
        status: "pending",
      });
    await superadminPb
      .collection(globalUserPermissionsCollectionName)
      .create(pendingSuperadmin2GlobalUserPermissionsPayload);

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

    const testFn = async (p: { pb: PocketBase }) =>
      p.pb.collection(organisationUserPermissionsCollectionName).getFullList();

    expect((await testFn({ pb: pendingSuperadmin2Pb })).length).toBe(0);
    expect((await testFn({ pb: superadminPb })).length).toBe(2);
    expect((await testFn({ pb: user1Pb })).length).toBe(1);
  });
  it("PDBP-OUP-LIST-03 — Global Admin (approved) can LIST", async () => {
    const superadminPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminPb.collection(usersCollectionName).create(superadminUserPayload);
    await superadminPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    const organisationRecord = await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());

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

    const organisationUserPermissionRecords = await adminPb
      .collection(organisationUserPermissionsCollectionName)
      .getFullList();
    expect(organisationUserPermissionRecords.length).toBe(2);
  });
  it("PDBP-OUP-LIST-04 — Global Admin (pending or blocked) cannot LIST", async () => {});
  // it("PDBP-OUP-LIST-05 — Global Standard (approved) can LIST", async () => {});
  // it("PDBP-OUP-LIST-06 — Global Standard (pending or blocked) cannot LIST", async () => {});
  // it("PDBP-OUP-LIST-07 — Organisation Admin (approved) can LIST", async () => {});
  // it("PDBP-OUP-LIST-08 — Organisation Admin (pending or blocked) cannot LIST", async () => {});
  // it("PDBP-OUP-LIST-09 — Organisation Standard (approved) can LIST", async () => {});
  // it("PDBP-OUP-LIST-10 — Organisation Standard (pending or blocked) cannot LIST", async () => {});

  // it("PDBP-OUP-LIST-OWN-01 — Organisation Admin can LIST OWN", async () => {});
  // it("PDBP-OUP-LIST-OWN-02 — Organisation Standard can LIST OWN", async () => {});
});
