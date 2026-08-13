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
import {
  globalUserPermissionsCollectionName,
  globalUserPermissionsPayloadBuilder,
} from "@repo/pokkit-db-permissions-ts-helpers";

const testMetadata =
  pokkitDbPermissionsTestsMetadata.pokkitDbPermissionsGlobalUserPermissionsCollectionCreate;
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

  it("PDBP-GUP-CREATE-01 — Global Superadmin can CREATE", async () => {
    const superadminUserPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminUserPb.collection(usersCollectionName).create(superadminUserPayload);
    await superadminUserPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

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
    const createdGlobalUserPermissionsRecord = await superadminUserPb
      .collection(globalUserPermissionsCollectionName)
      .create(standardGlobalUserPermissionsPayload);

    expect(createdGlobalUserPermissionsRecord).toMatchObject(standardGlobalUserPermissionsPayload);
  });

  it("PDBP-GUP-CREATE-02 — Global Admin cannot CREATE", async () => {
    const superadminUserPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminUserPb.collection(usersCollectionName).create(superadminUserPayload);
    await superadminUserPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    const adminUserPb = createPbConnection();
    const adminUserPayload = userPayloadBuilder.forCreateRandomData();
    const adminUserRecord = await adminUserPb
      .collection(usersCollectionName)
      .create(adminUserPayload);
    await adminUserPb
      .collection(usersCollectionName)
      .authWithPassword(adminUserPayload.email, adminUserPayload.password);

    const approvedAdminGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: adminUserRecord.id,
        role: "admin",
        status: "approved",
      });
    await superadminUserPb
      .collection(globalUserPermissionsCollectionName)
      .create(approvedAdminGlobalUserPermissionsPayload);

    const user1Pb = createPbConnection();
    const user1Payload = userPayloadBuilder.forCreateRandomData();
    const user1Record = await user1Pb.collection(usersCollectionName).create(user1Payload);
    await user1Pb
      .collection(usersCollectionName)
      .authWithPassword(user1Payload.email, user1Payload.password);

    await expect(
      adminUserPb.collection(globalUserPermissionsCollectionName).create(
        globalUserPermissionsPayloadBuilder.forCreateData({
          userId: user1Record.id,
          role: "standard",
          status: "approved",
        }),
      ),
    ).rejects.toThrow();
  });

  it("PDBP-GUP-CREATE-03 — Global Standard cannot CREATE", async () => {
    const superadminUserPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminUserPb.collection(usersCollectionName).create(superadminUserPayload);
    await superadminUserPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    const standardUserPb = createPbConnection();
    const standardUserPayload = userPayloadBuilder.forCreateRandomData();
    const standardUserRecord = await standardUserPb
      .collection(usersCollectionName)
      .create(standardUserPayload);
    await standardUserPb
      .collection(usersCollectionName)
      .authWithPassword(standardUserPayload.email, standardUserPayload.password);

    await superadminUserPb.collection(globalUserPermissionsCollectionName).create(
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: standardUserRecord.id,
        role: "standard",
        status: "approved",
      }),
    );

    const user1Pb = createPbConnection();
    const user1Payload = userPayloadBuilder.forCreateRandomData();
    const user1Record = await user1Pb.collection(usersCollectionName).create(user1Payload);
    await user1Pb
      .collection(usersCollectionName)
      .authWithPassword(user1Payload.email, user1Payload.password);

    await expect(
      standardUserPb.collection(globalUserPermissionsCollectionName).create(
        globalUserPermissionsPayloadBuilder.forCreateData({
          userId: user1Record.id,
          role: "standard",
          status: "approved",
        }),
      ),
    ).rejects.toThrow();
  });
});
