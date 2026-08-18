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

/**

@collection.globalUserPermissions.userId ?= @request.auth.id 
&& @collection.globalUserPermissions.role ?= "superadmin" 
&& @collection.globalUserPermissions.status ?= "approved"
&& orgId:changed = false
	|| @collection.organisationUserPermissions.userId ?= @request.auth.id 
&& @collection.organisationUserPermissions.role ?= "admin"
&& @collection.organisationUserPermissions.status ?= "approved"
&& @collection.organisationUserPermissions.orgId ?= orgId
&& @collection.organisationUserPermissions.userId ?!= userId
&& orgId:changed = false

// works

@collection.globalUserPermissions.userId ?= @request.auth.id 
&& @collection.globalUserPermissions.role ?= "superadmin" 
&& @collection.globalUserPermissions.status ?= "approved"
&& @request.body.orgId = orgId


 */

const testMetadata =
  pokkitDbPermissionsTestsMetadata.pokkitDbPermissionsOrganisationUserPermissionsCollectionUpdate;
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
    // const superuserPb = createPbConnection();
    // await superuserPb
    //   .collection(superusersCollectionName)
    //   .authWithPassword(superuserEmail, superuserPassword);
    // const logs = await pollPbLogsUntilNumberOfItemsChange({
    //   pb: superuserPb,
    //   maxDurationMs: 7000,
    //   delayMs: 100,
    // });

    // fse.writeFileSync(`${logFilePath}-logs.json`, JSON.stringify(logs, null, 2), "utf-8");

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

  it("PDBP-OUP-UPDATE-01 — Global Superadmin (approved) can UPDATE", async () => {
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

    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);
    const user1OrganisationUserPermissionRecord = await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(user1OrganisationUserPermissionsPayload);

    await expect(
      superadminAndOrgAdminPb
        .collection(organisationUserPermissionsCollectionName)
        .update(user1OrganisationUserPermissionRecord.id, {
          ...user1OrganisationUserPermissionRecord,
          role: "standard",
        }),
    ).resolves.toMatchObject({ role: "standard" });
  });
  // it("PDBP-OUP-UPDATE-02 — Global Superadmin (pending or blocked) cannot UPDATE", async () => {});
  // it("PDBP-OUP-UPDATE-03 — Global Admin (approved, pending, or blocked) cannot UPDATE", async () => {});
  // it("PDBP-OUP-UPDATE-04 — Global Standard (approved, pending, or blocked) cannot UPDATE", async () => {});

  // it("PDBP-OUP-UPDATE-AS-MEMBER-01 — Organisation Admin (approved) can UPDATE AS MEMBER", async () => {});
  // it("PDBP-OUP-UPDATE-AS-MEMBER-02 — Organisation Admin (pending or blocked) cannot UPDATE AS MEMBER", async () => {});
  // it("PDBP-OUP-UPDATE-AS-MEMBER-03 — Organisation Standard (approved, pending, or blocked) cannot UPDATE AS MEMBER", async () => {});

  // it("PDBP-OUP-UPDATE-AS-NON-MEMBER-01 — Organisation Admin (approved, pending, or blocked) cannot UPDATE AS NON-MEMBER", async () => {});
  // it("PDBP-OUP-UPDATE-AS-NON-MEMBER-02 — Organisation Standard (approved, pending, or blocked) cannot UPDATE AS NON-MEMBER", async () => {});

  // it("PDBP-OUP-UPDATE-OWN-01 — Organisation Admin (approved, pending, or blocked) cannot UPDATE OWN", async () => {});
  // it("PDBP-OUP-UPDATE-OWN-02 — Organisation Standard (approved, pending, or blocked) cannot UPDATE OWN", async () => {});

  // it("PDBP-OUP-IDENTITY-LOCK-UPDATE-01 — Global Superadmin (approved) cannot change userId on UPDATE", async () => {});
  // it("PDBP-OUP-IDENTITY-LOCK-UPDATE-02 — Global Superadmin (approved) cannot change orgId on UPDATE", async () => {});
  // it("PDBP-OUP-IDENTITY-LOCK-UPDATE-AS-MEMBER-01 — Organisation Admin (approved) cannot change userId on UPDATE AS MEMBER", async () => {});
  // it("PDBP-OUP-IDENTITY-LOCK-UPDATE-AS-MEMBER-02 — Organisation Admin (approved) cannot change orgId on UPDATE AS MEMBER", async () => {});
});
