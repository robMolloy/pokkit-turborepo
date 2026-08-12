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
import { globalUserPermissionsPayloadBuilder } from "@repo/pokkit-db-permissions-ts-helpers";

const globalUserPermissionsCollectionName = "globalUserPermissions";

const testMetadata =
  pokkitDbPermissionsTestsMetadata.pokkitDbPermissionsGlobalUserPermissionsCollection;
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

    // const pollLogsResp = await pollPbLogsUntilNumberOfItemsChange({
    //   pb: superuserPb,
    //   maxDurationMs: 10000,
    //   delayMs: 200,
    //   props: { page: 1, perPage: 30, options: { sort: "-created", filter: "level>0" } },
    // });

    // expect(pollLogsResp.success).toBe(true);
    // fse.writeFileSync(`${logFilePath}.json`, JSON.stringify(pollLogsResp.data, null, 2));

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

  it("PDBP-GUP-SETUP-01 — Verify collection presence and validity is setup correctly", async () => {
    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);

    const globalUserPermissionsCollection = superuserPb.collection(
      globalUserPermissionsCollectionName,
    );

    expect(globalUserPermissionsCollection).toBeTruthy();
  });

  it("PDBP-GUP-SETUP-02 — First user created is a global superadmin", async () => {
    const superadminPb = createPbConnection();
    const userPayload = userPayloadBuilder.forCreateRandomData();
    await superadminPb.collection(usersCollectionName).create(userPayload);
    await superadminPb
      .collection(usersCollectionName)
      .authWithPassword(userPayload.email, userPayload.passwordConfirm);

    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);

    const globalUserPermissionsCollection = superuserPb.collection(
      globalUserPermissionsCollectionName,
    );

    const globalUserPermissionsRecords = await globalUserPermissionsCollection.getFullList();
    expect(globalUserPermissionsRecords.length).toBe(1);

    const globalUserPermissionsRecord = globalUserPermissionsRecords[0];
    expect(globalUserPermissionsRecord).toMatchObject({ status: "approved", role: "superadmin" });
  });

  it("PDBP-GUP-CREATE-01 — Global Superadmin can CREATE", async () => {
    const superadminUserPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminUserPb.collection(usersCollectionName).create(superadminUserPayload);
    await superadminUserPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.passwordConfirm);

    const standardUserPb = createPbConnection();
    const standardUserPayload = userPayloadBuilder.forCreateRandomData();
    await standardUserPb.collection(usersCollectionName).create(standardUserPayload);
    const standardUserRecord = await standardUserPb
      .collection(usersCollectionName)
      .authWithPassword(standardUserPayload.email, standardUserPayload.passwordConfirm);

    const standardGlobalUserPermissionsPayload = globalUserPermissionsPayloadBuilder.forCreateData({
      userId: standardUserRecord.record.id,
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
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.passwordConfirm);

    const adminUserPb = createPbConnection();
    const adminUserPayload = userPayloadBuilder.forCreateRandomData();
    await adminUserPb.collection(usersCollectionName).create(adminUserPayload);
    const adminUserRecord = await adminUserPb
      .collection(usersCollectionName)
      .authWithPassword(adminUserPayload.email, adminUserPayload.passwordConfirm);

    const approvedAdminGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: adminUserRecord.record.id,
        role: "admin",
        status: "approved",
      });
    await superadminUserPb
      .collection(globalUserPermissionsCollectionName)
      .create(approvedAdminGlobalUserPermissionsPayload);

    const user1Pb = createPbConnection();
    const user1Payload = userPayloadBuilder.forCreateRandomData();
    await user1Pb.collection(usersCollectionName).create(user1Payload);
    const user1Record = await user1Pb
      .collection(usersCollectionName)
      .authWithPassword(user1Payload.email, user1Payload.passwordConfirm);

    await expect(
      adminUserPb.collection(globalUserPermissionsCollectionName).create(
        globalUserPermissionsPayloadBuilder.forCreateData({
          userId: user1Record.record.id,
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
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.passwordConfirm);

    const standardUserPb = createPbConnection();
    const standardUserPayload = userPayloadBuilder.forCreateRandomData();
    await standardUserPb.collection(usersCollectionName).create(standardUserPayload);
    const standardUserRecord = await standardUserPb
      .collection(usersCollectionName)
      .authWithPassword(standardUserPayload.email, standardUserPayload.passwordConfirm);

    await superadminUserPb.collection(globalUserPermissionsCollectionName).create(
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: standardUserRecord.record.id,
        role: "standard",
        status: "approved",
      }),
    );

    const user1Pb = createPbConnection();
    const user1Payload = userPayloadBuilder.forCreateRandomData();
    await user1Pb.collection(usersCollectionName).create(user1Payload);
    const user1Record = await user1Pb
      .collection(usersCollectionName)
      .authWithPassword(user1Payload.email, user1Payload.passwordConfirm);

    await expect(
      standardUserPb.collection(globalUserPermissionsCollectionName).create(
        globalUserPermissionsPayloadBuilder.forCreateData({
          userId: user1Record.record.id,
          role: "standard",
          status: "approved",
        }),
      ),
    ).rejects.toThrow();
  });

  it("PDBP-GUP-CREATE-OWN-01 — Global Superadmin cannot CREATE OWN", async () => {
    const superadminUserPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    const superadminUserRecord = await superadminUserPb
      .collection(usersCollectionName)
      .create(superadminUserPayload);
    await superadminUserPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.passwordConfirm);

    await expect(
      superadminUserPb.collection(globalUserPermissionsCollectionName).create(
        globalUserPermissionsPayloadBuilder.forCreateData({
          userId: superadminUserRecord.id,
          role: "admin",
          status: "approved",
        }),
      ),
    ).rejects.toThrow();
  });

  it("PDBP-GUP-CREATE-OWN-02 — Global Admin cannot CREATE OWN", async () => {
    const superadminUserPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminUserPb.collection(usersCollectionName).create(superadminUserPayload);
    await superadminUserPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.passwordConfirm);

    const adminUserPb = createPbConnection();
    const adminUserPayload = userPayloadBuilder.forCreateRandomData();
    await adminUserPb.collection(usersCollectionName).create(adminUserPayload);
    const adminUserRecord = await adminUserPb
      .collection(usersCollectionName)
      .authWithPassword(adminUserPayload.email, adminUserPayload.passwordConfirm);

    await superadminUserPb.collection(globalUserPermissionsCollectionName).create(
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: adminUserRecord.record.id,
        role: "admin",
        status: "approved",
      }),
    );

    const exampleUserPb = createPbConnection();
    const exampleUserPayload = userPayloadBuilder.forCreateRandomData();
    await exampleUserPb.collection(usersCollectionName).create(exampleUserPayload);
    const exampleUserRecord = await exampleUserPb
      .collection(usersCollectionName)
      .authWithPassword(exampleUserPayload.email, exampleUserPayload.passwordConfirm);

    await expect(
      exampleUserPb.collection(globalUserPermissionsCollectionName).create(
        globalUserPermissionsPayloadBuilder.forCreateData({
          userId: exampleUserRecord.record.id,
          role: "standard",
          status: "approved",
        }),
      ),
    ).rejects.toThrow();
  });

  it("PDBP-GUP-CREATE-OWN-03 — Global Standard cannot CREATE OWN", async () => {
    const superadminUserPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminUserPb.collection(usersCollectionName).create(superadminUserPayload);
    await superadminUserPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.passwordConfirm);

    const standardUserPb = createPbConnection();
    const standardUserPayload = userPayloadBuilder.forCreateRandomData();
    await standardUserPb.collection(usersCollectionName).create(standardUserPayload);
    const standardUserRecord = await standardUserPb
      .collection(usersCollectionName)
      .authWithPassword(standardUserPayload.email, standardUserPayload.passwordConfirm);

    await superadminUserPb.collection(globalUserPermissionsCollectionName).create(
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: standardUserRecord.record.id,
        role: "standard",
        status: "approved",
      }),
    );

    const exampleUserPb = createPbConnection();
    const exampleUserPayload = userPayloadBuilder.forCreateRandomData();
    await exampleUserPb.collection(usersCollectionName).create(exampleUserPayload);
    const exampleUserRecord = await exampleUserPb
      .collection(usersCollectionName)
      .authWithPassword(exampleUserPayload.email, exampleUserPayload.passwordConfirm);

    await expect(
      exampleUserPb.collection(globalUserPermissionsCollectionName).create(
        globalUserPermissionsPayloadBuilder.forCreateData({
          userId: exampleUserRecord.record.id,
          role: "standard",
          status: "approved",
        }),
      ),
    ).rejects.toThrow();
  });

  it("PDBP-GUP-VIEW-01 — Global Superadmin can VIEW", async () => {
    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);

    const superadminUserPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    const superadminUserRecord = await superadminUserPb
      .collection(usersCollectionName)
      .create(superadminUserPayload);
    await superadminUserPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.passwordConfirm);

    const exampleUserPb = createPbConnection();
    const exampleUserPayload = userPayloadBuilder.forCreateRandomData();
    await exampleUserPb.collection(usersCollectionName).create(exampleUserPayload);
    const exampleUserRecord = await exampleUserPb
      .collection(usersCollectionName)
      .authWithPassword(exampleUserPayload.email, exampleUserPayload.passwordConfirm);

    await superuserPb.collection(globalUserPermissionsCollectionName).create(
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: exampleUserRecord.record.id,
        role: "admin",
        status: "approved",
      }),
    );

    const globalUserPermissionsFullList = await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .getFullList();
    expect(globalUserPermissionsFullList.length).toBe(2);

    const superadminGlobalUserPermissionsRecord = globalUserPermissionsFullList.find(
      (record) => record.userId === superadminUserRecord.id,
    );
    const exampleUserGlobalUserPermissionsRecord = globalUserPermissionsFullList.find(
      (record) => record.userId === exampleUserRecord.record.id,
    );
    if (!superadminGlobalUserPermissionsRecord)
      return expect(superadminGlobalUserPermissionsRecord).toBeTruthy();
    if (!exampleUserGlobalUserPermissionsRecord)
      return expect(exampleUserGlobalUserPermissionsRecord).toBeTruthy();

    const globalUserPermissionsRecordTest = await superadminUserPb
      .collection(globalUserPermissionsCollectionName)
      .getOne(superadminGlobalUserPermissionsRecord.id);

    expect(globalUserPermissionsRecordTest).toMatchObject({
      userId: superadminUserRecord.id,
      status: "approved",
      role: "superadmin",
    });
    const exampleUserGlobalUserPermissionsRecordTest = await superadminUserPb
      .collection(globalUserPermissionsCollectionName)
      .getOne(exampleUserGlobalUserPermissionsRecord.id);

    expect(exampleUserGlobalUserPermissionsRecordTest).toMatchObject({
      userId: exampleUserRecord.record.id,
      status: "approved",
      role: "admin",
    });
  });

  it("PDBP-GUP-VIEW-02 — Global Admin (approved) can VIEW", async () => {
    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);

    const superadminUserPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    const superadminUserRecord = await superadminUserPb
      .collection(usersCollectionName)
      .create(superadminUserPayload);
    await superadminUserPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.passwordConfirm);

    const adminUserPb = createPbConnection();
    const adminUserPayload = userPayloadBuilder.forCreateRandomData();
    await adminUserPb.collection(usersCollectionName).create(adminUserPayload);
    const adminUserRecord = await adminUserPb
      .collection(usersCollectionName)
      .authWithPassword(adminUserPayload.email, adminUserPayload.passwordConfirm);

    // no need to add this as first user is auto-elevated to superadmin
    const superadminGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: superadminUserRecord.id,
        role: "superadmin",
        status: "approved",
      });
    const adminGlobalUserPermissionsPayload = globalUserPermissionsPayloadBuilder.forCreateData({
      userId: adminUserRecord.record.id,
      role: "admin",
      status: "approved",
    });
    await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .create(adminGlobalUserPermissionsPayload);

    const globalUserPermissionsFullList = await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .getFullList();
    expect(globalUserPermissionsFullList.length).toBe(2);

    const superadminGlobalUserPermissionsRecord = globalUserPermissionsFullList.find(
      (record) => record.userId === superadminUserRecord.id,
    );
    if (!superadminGlobalUserPermissionsRecord)
      return expect(superadminGlobalUserPermissionsRecord).toBeTruthy();

    const adminGlobalUserPermissionsRecord = globalUserPermissionsFullList.find(
      (record) => record.userId === adminUserRecord.record.id,
    );
    if (!adminGlobalUserPermissionsRecord)
      return expect(adminGlobalUserPermissionsRecord).toBeTruthy();

    const superadminGlobalUserPermissionsRecordTest = await adminUserPb
      .collection(globalUserPermissionsCollectionName)
      .getOne(superadminGlobalUserPermissionsRecord.id);
    expect(superadminGlobalUserPermissionsRecordTest).toMatchObject(
      superadminGlobalUserPermissionsPayload,
    );

    const adminGlobalUserPermissionsRecordTest = await adminUserPb
      .collection(globalUserPermissionsCollectionName)
      .getOne(adminGlobalUserPermissionsRecord.id);
    expect(adminGlobalUserPermissionsRecordTest).toMatchObject(adminGlobalUserPermissionsPayload);
  });

  it("PDBP-GUP-VIEW-03 — Global Admin (pending or blocked) cannot VIEW", async () => {
    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);

    const superadminUserPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    const superadminUserRecord = await superadminUserPb
      .collection(usersCollectionName)
      .create(superadminUserPayload);
    await superadminUserPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.passwordConfirm);

    const adminUserPb = createPbConnection();
    const adminUserPayload = userPayloadBuilder.forCreateRandomData();
    await adminUserPb.collection(usersCollectionName).create(adminUserPayload);
    const adminUserRecord = await adminUserPb
      .collection(usersCollectionName)
      .authWithPassword(adminUserPayload.email, adminUserPayload.passwordConfirm);

    // no need to add this as first user is auto-elevated to superadmin
    const superadminGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: superadminUserRecord.id,
        role: "superadmin",
        status: "approved",
      });
    const adminGlobalUserPermissionsPayload = globalUserPermissionsPayloadBuilder.forCreateData({
      userId: adminUserRecord.record.id,
      role: "admin",
      status: "pending",
    });
    await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .create(adminGlobalUserPermissionsPayload);

    const globalUserPermissionsFullList = await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .getFullList();
    expect(globalUserPermissionsFullList.length).toBe(2);

    const superadminGlobalUserPermissionsRecord = globalUserPermissionsFullList.find(
      (record) => record.userId === superadminUserRecord.id,
    );
    if (!superadminGlobalUserPermissionsRecord)
      return expect(superadminGlobalUserPermissionsRecord).toBeTruthy();

    const adminGlobalUserPermissionsRecord = globalUserPermissionsFullList.find(
      (record) => record.userId === adminUserRecord.record.id,
    );
    if (!adminGlobalUserPermissionsRecord)
      return expect(adminGlobalUserPermissionsRecord).toBeTruthy();

    await expect(
      adminUserPb
        .collection(globalUserPermissionsCollectionName)
        .getOne(superadminGlobalUserPermissionsRecord.id),
    ).rejects.toThrow();

    await expect(
      adminUserPb
        .collection(globalUserPermissionsCollectionName)
        .getOne(adminGlobalUserPermissionsRecord.id),
    ).rejects.toThrow();
  });

  it("PDBP-GUP-VIEW-04 — Global Standard (approved) can VIEW", async () => {
    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);

    const superadminUserPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    const superadminUserRecord = await superadminUserPb
      .collection(usersCollectionName)
      .create(superadminUserPayload);
    await superadminUserPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.passwordConfirm);

    const standardUserPb = createPbConnection();
    const standardUserPayload = userPayloadBuilder.forCreateRandomData();
    await standardUserPb.collection(usersCollectionName).create(standardUserPayload);
    const standardUserRecord = await standardUserPb
      .collection(usersCollectionName)
      .authWithPassword(standardUserPayload.email, standardUserPayload.passwordConfirm);

    // no need to add this as first user is auto-elevated to superadmin
    const superadminGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: superadminUserRecord.id,
        role: "superadmin",
        status: "approved",
      });
    const standardGlobalUserPermissionsPayload = globalUserPermissionsPayloadBuilder.forCreateData({
      userId: standardUserRecord.record.id,
      role: "standard",
      status: "approved",
    });

    await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .create(standardGlobalUserPermissionsPayload);

    const globalUserPermissionsFullList = await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .getFullList();
    expect(globalUserPermissionsFullList.length).toBe(2);

    const superadminGlobalUserPermissionsRecord = globalUserPermissionsFullList.find(
      (record) => record.userId === superadminUserRecord.id,
    );
    if (!superadminGlobalUserPermissionsRecord)
      return expect(superadminGlobalUserPermissionsRecord).toBeTruthy();

    const superadminGlobalUserPermissionsRecordTest = await standardUserPb
      .collection(globalUserPermissionsCollectionName)
      .getOne(superadminGlobalUserPermissionsRecord.id);
    expect(superadminGlobalUserPermissionsRecordTest).toMatchObject(
      superadminGlobalUserPermissionsPayload,
    );

    const standardGlobalUserPermissionsRecord = globalUserPermissionsFullList.find(
      (record) => record.userId === standardUserRecord.record.id,
    );
    if (!standardGlobalUserPermissionsRecord)
      return expect(standardGlobalUserPermissionsRecord).toBeTruthy();

    const standardGlobalUserPermissionsRecordTest = await standardUserPb
      .collection(globalUserPermissionsCollectionName)
      .getOne(standardGlobalUserPermissionsRecord.id);
    expect(standardGlobalUserPermissionsRecordTest).toMatchObject(
      standardGlobalUserPermissionsPayload,
    );
  });

  it("PDBP-GUP-VIEW-05 — Global Standard (pending or blocked) cannot VIEW", async () => {
    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);

    const superadminUserPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    const superadminUserRecord = await superadminUserPb
      .collection(usersCollectionName)
      .create(superadminUserPayload);
    await superadminUserPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.passwordConfirm);

    const pendingUserPb = createPbConnection();
    const pendingUserPayload = userPayloadBuilder.forCreateRandomData();
    await pendingUserPb.collection(usersCollectionName).create(pendingUserPayload);
    const pendingUserRecord = await pendingUserPb
      .collection(usersCollectionName)
      .authWithPassword(pendingUserPayload.email, pendingUserPayload.passwordConfirm);

    const blockedUserPb = createPbConnection();
    const blockedUserPayload = userPayloadBuilder.forCreateRandomData();
    await blockedUserPb.collection(usersCollectionName).create(blockedUserPayload);
    const blockedUserRecord = await blockedUserPb
      .collection(usersCollectionName)
      .authWithPassword(blockedUserPayload.email, blockedUserPayload.passwordConfirm);

    const pendingStandardGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: pendingUserRecord.record.id,
        role: "standard",
        status: "pending",
      });
    const blockedStandardGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: blockedUserRecord.record.id,
        role: "standard",
        status: "blocked",
      });

    await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .create(pendingStandardGlobalUserPermissionsPayload);
    await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .create(blockedStandardGlobalUserPermissionsPayload);

    const globalUserPermissionsFullList = await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .getFullList();
    expect(globalUserPermissionsFullList.length).toBe(3);

    const superadminGlobalUserPermissionsRecord = globalUserPermissionsFullList.find(
      (record) => record.userId === superadminUserRecord.id,
    );
    if (!superadminGlobalUserPermissionsRecord)
      return expect(superadminGlobalUserPermissionsRecord).toBeTruthy();

    await expect(
      pendingUserPb
        .collection(globalUserPermissionsCollectionName)
        .getOne(superadminGlobalUserPermissionsRecord.id),
    ).rejects.toThrow();

    await expect(
      blockedUserPb
        .collection(globalUserPermissionsCollectionName)
        .getOne(superadminGlobalUserPermissionsRecord.id),
    ).rejects.toThrow();
  });

  it("PDBP-GUP-VIEW-OWN-01 — Global Superadmin can VIEW OWN", async () => {
    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);

    const superadminUserPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    const superadminUserRecord = await superadminUserPb
      .collection(usersCollectionName)
      .create(superadminUserPayload);
    await superadminUserPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.passwordConfirm);

    // no need to add this as first user is auto-elevated to superadmin
    const superadminGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: superadminUserRecord.id,
        role: "superadmin",
        status: "approved",
      });

    const globalUserPermissionsFullList = await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .getFullList();
    expect(globalUserPermissionsFullList.length).toBe(1);

    const superadminGlobalUserPermissionsRecord = globalUserPermissionsFullList.find(
      (record) => record.userId === superadminUserRecord.id,
    );
    if (!superadminGlobalUserPermissionsRecord)
      return expect(superadminGlobalUserPermissionsRecord).toBeTruthy();

    const superadminGlobalUserPermissionsRecordTest = await superadminUserPb
      .collection(globalUserPermissionsCollectionName)
      .getOne(superadminGlobalUserPermissionsRecord.id);
    expect(superadminGlobalUserPermissionsRecordTest).toMatchObject(
      superadminGlobalUserPermissionsPayload,
    );
  });

  it("PDBP-GUP-VIEW-OWN-02 — Global Admin (approved) can VIEW OWN", async () => {
    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);

    const superadminUserPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminUserPb.collection(usersCollectionName).create(superadminUserPayload);
    await superadminUserPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.passwordConfirm);

    const adminUserPb = createPbConnection();
    const adminUserPayload = userPayloadBuilder.forCreateRandomData();
    await adminUserPb.collection(usersCollectionName).create(adminUserPayload);
    const adminUserRecord = await adminUserPb
      .collection(usersCollectionName)
      .authWithPassword(adminUserPayload.email, adminUserPayload.passwordConfirm);

    const adminGlobalUserPermissionsPayload = globalUserPermissionsPayloadBuilder.forCreateData({
      userId: adminUserRecord.record.id,
      role: "admin",
      status: "approved",
    });
    await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .create(adminGlobalUserPermissionsPayload);

    const globalUserPermissionsFullList = await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .getFullList();
    expect(globalUserPermissionsFullList.length).toBe(2);

    const adminGlobalUserPermissionsRecord = globalUserPermissionsFullList.find(
      (record) => record.userId === adminUserRecord.record.id,
    );
    if (!adminGlobalUserPermissionsRecord)
      return expect(adminGlobalUserPermissionsRecord).toBeTruthy();

    const adminGlobalUserPermissionsRecordTest = await adminUserPb
      .collection(globalUserPermissionsCollectionName)
      .getOne(adminGlobalUserPermissionsRecord.id);
    expect(adminGlobalUserPermissionsRecordTest).toMatchObject(adminGlobalUserPermissionsPayload);
  });

  it("PDBP-USERS-VIEW-OWN-03 — Global Admin (pending or blocked) cannot VIEW OWN", async () => {
    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);

    const superadminUserPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminUserPb.collection(usersCollectionName).create(superadminUserPayload);
    await superadminUserPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.passwordConfirm);

    const pendingAdminUserPb = createPbConnection();
    const pendingAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    await pendingAdminUserPb.collection(usersCollectionName).create(pendingAdminUserPayload);
    const pendingAdminUserRecord = await pendingAdminUserPb
      .collection(usersCollectionName)
      .authWithPassword(pendingAdminUserPayload.email, pendingAdminUserPayload.passwordConfirm);

    const blockedAdminUserPb = createPbConnection();
    const blockedAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    await blockedAdminUserPb.collection(usersCollectionName).create(blockedAdminUserPayload);
    const blockedAdminUserRecord = await blockedAdminUserPb
      .collection(usersCollectionName)
      .authWithPassword(blockedAdminUserPayload.email, blockedAdminUserPayload.passwordConfirm);

    const pendingAdminGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: pendingAdminUserRecord.record.id,
        role: "admin",
        status: "pending",
      });
    const blockedAdminGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: blockedAdminUserRecord.record.id,
        role: "admin",
        status: "blocked",
      });
    await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .create(pendingAdminGlobalUserPermissionsPayload);
    await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .create(blockedAdminGlobalUserPermissionsPayload);

    const globalUserPermissionsFullList = await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .getFullList();
    expect(globalUserPermissionsFullList.length).toBe(3);

    const adminGlobalUserPermissionsRecord = globalUserPermissionsFullList.find(
      (record) => record.userId === pendingAdminUserRecord.record.id,
    );
    if (!adminGlobalUserPermissionsRecord)
      return expect(adminGlobalUserPermissionsRecord).toBeTruthy();

    await expect(
      pendingAdminUserPb
        .collection(globalUserPermissionsCollectionName)
        .getOne(adminGlobalUserPermissionsRecord.id),
    ).rejects.toThrow();

    await expect(
      pendingAdminUserPb
        .collection(globalUserPermissionsCollectionName)
        .getOne(adminGlobalUserPermissionsRecord.id),
    ).rejects.toThrow();
  });

  // it("PDBP-GUP-VIEW-OWN-04 — Global Standard (approved) can VIEW OWN", async () => {});

  // it(
  //   "PDBP-USERS-VIEW-OWN-05 — Global Standard (pending or blocked) cannot VIEW OWN",
  //   async () => {},
  // );

  // it("PDBP-GUP-LIST-01 — Global Superadmin can LIST", async () => {});

  // it("PDBP-GUP-LIST-02 — Global Admin (approved) can LIST", async () => {});

  // it("PDBP-GUP-LIST-03 — Global Admin (pending or blocked) cannot LIST", async () => {});

  // it("PDBP-GUP-LIST-04 — Global Standard (approved) can LIST", async () => {});

  // it("PDBP-GUP-LIST-05 — Global Standard (pending or blocked) cannot LIST", async () => {});

  // it("PDBP-GUP-LIST-OWN-01 — Global Superadmin can LIST OWN", async () => {});

  // it("PDBP-GUP-LIST-OWN-02 — Global Admin (approved) can LIST OWN", async () => {});

  // it(
  //   "PDBP-USERS-LIST-OWN-03 — Global Admin (pending or blocked) cannot LIST OWN",
  //   async () => {},
  // );

  // it("PDBP-GUP-LIST-OWN-04 — Global Standard (approved) can LIST OWN", async () => {});

  // it(
  //   "PDBP-USERS-LIST-OWN-05 — Global Standard (pending or blocked) cannot LIST OWN",
  //   async () => {},
  // );

  // it("PDBP-GUP-UPDATE-01 — Global Superadmin can UPDATE", async () => {});

  // it("PDBP-GUP-UPDATE-02 — Global Admin cannot UPDATE", async () => {});

  // it("PDBP-GUP-UPDATE-03 — Global Standard cannot UPDATE", async () => {});

  // it("PDBP-GUP-UPDATE-OWN-01 — Global Superadmin cannot UPDATE OWN", async () => {});

  // it("PDBP-GUP-UPDATE-OWN-02 — Global Admin cannot UPDATE OWN", async () => {});

  // it("PDBP-GUP-UPDATE-OWN-03 — Global Standard cannot UPDATE OWN", async () => {});

  // it("PDBP-GUP-DELETE-01 — Global Superadmin can DELETE", async () => {});

  // it("PDBP-GUP-DELETE-02 — Global Admin cannot DELETE", async () => {});

  // it("PDBP-GUP-DELETE-03 — Global Standard cannot DELETE", async () => {});

  // it("PDBP-GUP-DELETE-OWN-01 — Global Superadmin cannot DELETE OWN", async () => {});

  // it("PDBP-GUP-DELETE-OWN-02 — Global Admin (approved) can DELETE OWN", async () => {});

  // it(
  //   "PDBP-USERS-DELETE-OWN-03 — Global Admin (pending or blocked) cannot DELETE OWN",
  //   async () => {},
  // );

  // it("PDBP-GUP-DELETE-OWN-04 — Global Standard (approved) can DELETE OWN", async () => {});

  // it(
  //   "PDBP-USERS-DELETE-OWN-05 — Global Standard (pending or blocked) cannot DELETE OWN",
  //   async () => {},
  // );
});
