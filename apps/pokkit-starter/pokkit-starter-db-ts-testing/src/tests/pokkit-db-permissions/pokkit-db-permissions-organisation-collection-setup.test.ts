import {
  organisationsCollectionName,
  organisationsPayloadBuilder,
  organisationUserPermissionsCollectionName,
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
  pokkitDbPermissionsTestsMetadata.pokkitDbPermissionsOrganisationsCollectionSetup;
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
    // const logs = await pollPbLogsUntilNumberOfItemsChange({
    //   pb: createPbConnection(),
    //   maxDurationMs: 30000,
    //   delayMs: 1000,
    //   props: {
    //     page: 1,
    //     perPage: 100,
    //     options: {},
    //   },
    // });

    // fse.writeFileSync(`${logFilePath}-logs.json`, JSON.stringify(logs, null, 2));

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

  it("PDBP-ORG-SETUP-01 — Verify collection presence and validity is setup correctly", async () => {
    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);
    const collections = await superuserPb.collections.getFullList();
    const orgCollection = collections.find((c) => c.name === organisationsCollectionName);
    expect(orgCollection).toBeTruthy();
  });

  it("PDBP-ORG-SETUP-02 — organisation creator becomes approved admin in organisationUserPermissions", async () => {
    const superadminPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    const superadminUserRecord = await superadminPb
      .collection(usersCollectionName)
      .create(superadminUserPayload);
    await superadminPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    const organisationPayload = organisationsPayloadBuilder.forCreateRandomData();
    const organisationRecord = await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationPayload);

    const orgUserPermissions = await superadminPb
      .collection(organisationUserPermissionsCollectionName)
      .getFullList();
    const orgUserPermission = orgUserPermissions.find(
      (p) => p.userId === superadminUserRecord.id && p.orgId === organisationRecord.id,
    );
    expect(orgUserPermission).toMatchObject({ role: "admin", status: "approved" });
  });
});
