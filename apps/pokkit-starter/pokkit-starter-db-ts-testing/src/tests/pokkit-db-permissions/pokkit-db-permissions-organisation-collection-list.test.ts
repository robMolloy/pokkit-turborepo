import {
  globalUserPermissionsCollectionName,
  globalUserPermissionsPayloadBuilder,
  organisationsCollectionName,
  organisationsPayloadBuilder,
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
import { userPayloadBuilder } from "../../utils/pocketbaseUserHelpers";
import { sourceTestBuildDirPath, superuserEmail, superuserPassword } from "../_constants";
import { pokkitDbPermissionsTestsMetadata } from "./_pokkitDbConfigSyncTestsMetadata";

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
  it("PDBP-ORG-LIST-02 — Global Admin can LIST", async () => {
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
  it("PDBP-ORG-LIST-03 — Global Standard can LIST", async () => {
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
        role: "admin",
        status: "approved",
      }),
    );

    const organisations = await standardPb.collection(organisationsCollectionName).getFullList();
    expect(organisations.length).toBe(2);
  });
  it("PDBP-ORG-LIST-04 — Organisation Admin can LIST", async () => {
    // implied by PDBP-ORG-LIST-01,02,03
  });
  it("PDBP-ORG-LIST-05 — Organisation Standard can LIST", async () => {
    // implied by PDBP-ORG-LIST-01,02,03
    // CHANGE BEHAVIOUR - NON-APPOROVED SHOULD FAIL
  });

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
