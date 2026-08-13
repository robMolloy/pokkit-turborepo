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
      .authWithPassword(userPayload.email, userPayload.password);

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

  it("PDBP-GUP-CREATE-OWN-01 — Global Superadmin cannot CREATE OWN", async () => {
    const superadminUserPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    const superadminUserRecord = await superadminUserPb
      .collection(usersCollectionName)
      .create(superadminUserPayload);
    await superadminUserPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

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
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    const adminUserPb = createPbConnection();
    const adminUserPayload = userPayloadBuilder.forCreateRandomData();
    const adminUserRecord = await adminUserPb
      .collection(usersCollectionName)
      .create(adminUserPayload);
    await adminUserPb
      .collection(usersCollectionName)
      .authWithPassword(adminUserPayload.email, adminUserPayload.password);

    await superadminUserPb.collection(globalUserPermissionsCollectionName).create(
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: adminUserRecord.id,
        role: "admin",
        status: "approved",
      }),
    );

    const exampleUserPb = createPbConnection();
    const exampleUserPayload = userPayloadBuilder.forCreateRandomData();
    const exampleUserRecord = await exampleUserPb
      .collection(usersCollectionName)
      .create(exampleUserPayload);
    await exampleUserPb
      .collection(usersCollectionName)
      .authWithPassword(exampleUserPayload.email, exampleUserPayload.password);

    await expect(
      exampleUserPb.collection(globalUserPermissionsCollectionName).create(
        globalUserPermissionsPayloadBuilder.forCreateData({
          userId: exampleUserRecord.id,
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

    const exampleUserPb = createPbConnection();
    const exampleUserPayload = userPayloadBuilder.forCreateRandomData();
    const exampleUserRecord = await exampleUserPb
      .collection(usersCollectionName)
      .create(exampleUserPayload);
    await exampleUserPb
      .collection(usersCollectionName)
      .authWithPassword(exampleUserPayload.email, exampleUserPayload.password);

    await expect(
      exampleUserPb.collection(globalUserPermissionsCollectionName).create(
        globalUserPermissionsPayloadBuilder.forCreateData({
          userId: exampleUserRecord.id,
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
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    const exampleUserPb = createPbConnection();
    const exampleUserPayload = userPayloadBuilder.forCreateRandomData();
    const exampleUserRecord = await exampleUserPb
      .collection(usersCollectionName)
      .create(exampleUserPayload);
    await exampleUserPb
      .collection(usersCollectionName)
      .authWithPassword(exampleUserPayload.email, exampleUserPayload.password);

    const exampleUserGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: exampleUserRecord.id,
        role: "admin",
        status: "approved",
      });
    await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .create(exampleUserGlobalUserPermissionsPayload);

    const globalUserPermissionsFullList = await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .getFullList();
    expect(globalUserPermissionsFullList.length).toBe(2);

    const superadminGlobalUserPermissionsRecord = globalUserPermissionsFullList.find(
      (record) => record.userId === superadminUserRecord.id,
    );
    const exampleUserGlobalUserPermissionsRecord = globalUserPermissionsFullList.find(
      (record) => record.userId === exampleUserRecord.id,
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

    expect(exampleUserGlobalUserPermissionsRecordTest).toMatchObject(
      exampleUserGlobalUserPermissionsPayload,
    );
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
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    const adminUserPb = createPbConnection();
    const adminUserPayload = userPayloadBuilder.forCreateRandomData();
    const adminUserRecord = await adminUserPb
      .collection(usersCollectionName)
      .create(adminUserPayload);
    await adminUserPb
      .collection(usersCollectionName)
      .authWithPassword(adminUserPayload.email, adminUserPayload.password);

    // no need to add this as first user is auto-elevated to superadmin
    const superadminGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: superadminUserRecord.id,
        role: "superadmin",
        status: "approved",
      });
    const adminGlobalUserPermissionsPayload = globalUserPermissionsPayloadBuilder.forCreateData({
      userId: adminUserRecord.id,
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
      (record) => record.userId === adminUserRecord.id,
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
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

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
        role: "admin",
        status: "pending",
      });
    const pendingAdminGlobalUserPermissionsRecord = await superuserPb
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
        role: "admin",
        status: "blocked",
      });
    const blockedAdminGlobalUserPermissionsRecord = await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .create(blockedAdminGlobalUserPermissionsPayload);

    const globalUserPermissionsList = await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .getFullList({ filter: `userId = "${superadminUserRecord.id}"` });
    const superadminGlobalUserPermissionsRecord = globalUserPermissionsList[0];
    if (!superadminGlobalUserPermissionsRecord)
      return expect(superadminGlobalUserPermissionsRecord).toBeTruthy();
    expect(superadminGlobalUserPermissionsRecord).toMatchObject({ role: "superadmin" });

    await expect(
      pendingAdminUserPb
        .collection(globalUserPermissionsCollectionName)
        .getOne(superadminGlobalUserPermissionsRecord.id),
    ).rejects.toThrow();

    await expect(
      await pendingAdminUserPb
        .collection(globalUserPermissionsCollectionName)
        .getOne(pendingAdminGlobalUserPermissionsRecord.id),
    ).toMatchObject(pendingAdminGlobalUserPermissionsPayload);

    await expect(
      blockedAdminUserPb
        .collection(globalUserPermissionsCollectionName)
        .getOne(superadminGlobalUserPermissionsRecord.id),
    ).rejects.toThrow();

    await expect(
      await blockedAdminUserPb
        .collection(globalUserPermissionsCollectionName)
        .getOne(blockedAdminGlobalUserPermissionsRecord.id),
    ).toMatchObject(blockedAdminGlobalUserPermissionsPayload);
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
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    const standardUserPb = createPbConnection();
    const standardUserPayload = userPayloadBuilder.forCreateRandomData();
    const standardUserRecord = await standardUserPb
      .collection(usersCollectionName)
      .create(standardUserPayload);
    await standardUserPb
      .collection(usersCollectionName)
      .authWithPassword(standardUserPayload.email, standardUserPayload.password);

    // no need to add this as first user is auto-elevated to superadmin
    const superadminGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: superadminUserRecord.id,
        role: "superadmin",
        status: "approved",
      });
    const standardGlobalUserPermissionsPayload = globalUserPermissionsPayloadBuilder.forCreateData({
      userId: standardUserRecord.id,
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
      (record) => record.userId === standardUserRecord.id,
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
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    const pendingUserPb = createPbConnection();
    const pendingUserPayload = userPayloadBuilder.forCreateRandomData();
    const pendingUserRecord = await pendingUserPb
      .collection(usersCollectionName)
      .create(pendingUserPayload);
    await pendingUserPb
      .collection(usersCollectionName)
      .authWithPassword(pendingUserPayload.email, pendingUserPayload.password);

    const blockedUserPb = createPbConnection();
    const blockedUserPayload = userPayloadBuilder.forCreateRandomData();
    const blockedUserRecord = await blockedUserPb
      .collection(usersCollectionName)
      .create(blockedUserPayload);
    await blockedUserPb
      .collection(usersCollectionName)
      .authWithPassword(blockedUserPayload.email, blockedUserPayload.password);

    const pendingStandardGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: pendingUserRecord.id,
        role: "standard",
        status: "pending",
      });
    const blockedStandardGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: blockedUserRecord.id,
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
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

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
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

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
    await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .create(adminGlobalUserPermissionsPayload);

    const globalUserPermissionsFullList = await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .getFullList();
    expect(globalUserPermissionsFullList.length).toBe(2);

    const adminGlobalUserPermissionsRecord = globalUserPermissionsFullList.find(
      (record) => record.userId === adminUserRecord.id,
    );
    if (!adminGlobalUserPermissionsRecord)
      return expect(adminGlobalUserPermissionsRecord).toBeTruthy();

    const adminGlobalUserPermissionsRecordTest = await adminUserPb
      .collection(globalUserPermissionsCollectionName)
      .getOne(adminGlobalUserPermissionsRecord.id);
    expect(adminGlobalUserPermissionsRecordTest).toMatchObject(adminGlobalUserPermissionsPayload);
  });

  it("PDBP-USERS-VIEW-OWN-03 — Global Admin (pending or blocked) can VIEW only OWN", async () => {
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
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    const pendingAdminUserPb = createPbConnection();
    const pendingAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const pendingAdminUserRecord = await pendingAdminUserPb
      .collection(usersCollectionName)
      .create(pendingAdminUserPayload);
    await pendingAdminUserPb
      .collection(usersCollectionName)
      .authWithPassword(pendingAdminUserPayload.email, pendingAdminUserPayload.password);

    const blockedAdminUserPb = createPbConnection();
    const blockedAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const blockedAdminUserRecord = await blockedAdminUserPb
      .collection(usersCollectionName)
      .create(blockedAdminUserPayload);
    await blockedAdminUserPb
      .collection(usersCollectionName)
      .authWithPassword(blockedAdminUserPayload.email, blockedAdminUserPayload.password);

    const pendingAdminGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: pendingAdminUserRecord.id,
        role: "admin",
        status: "pending",
      });
    const blockedAdminGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: blockedAdminUserRecord.id,
        role: "admin",
        status: "blocked",
      });
    const pendingAdminGlobalUserPermissionsRecord = await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .create(pendingAdminGlobalUserPermissionsPayload);
    const blockedAdminGlobalUserPermissionsRecord = await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .create(blockedAdminGlobalUserPermissionsPayload);

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
      pendingAdminUserPb
        .collection(globalUserPermissionsCollectionName)
        .getOne(superadminGlobalUserPermissionsRecord.id),
    ).rejects.toThrow();

    expect(
      await pendingAdminUserPb
        .collection(globalUserPermissionsCollectionName)
        .getOne(pendingAdminGlobalUserPermissionsRecord.id),
    ).toMatchObject(pendingAdminGlobalUserPermissionsPayload);

    await expect(
      pendingAdminUserPb
        .collection(globalUserPermissionsCollectionName)
        .getOne(superadminGlobalUserPermissionsRecord.id),
    ).rejects.toThrow();

    expect(
      await blockedAdminUserPb
        .collection(globalUserPermissionsCollectionName)
        .getOne(blockedAdminGlobalUserPermissionsRecord.id),
    ).toMatchObject(blockedAdminGlobalUserPermissionsPayload);
  });

  it("PDBP-GUP-VIEW-OWN-04 — Global Standard (approved) can VIEW OWN", async () => {
    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);

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
    await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .create(standardGlobalUserPermissionsPayload);

    const globalUserPermissionsFullList = await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .getFullList();
    expect(globalUserPermissionsFullList.length).toBe(2);

    const standardGlobalUserPermissionsRecord = globalUserPermissionsFullList.find(
      (record) => record.userId === standardUserRecord.id,
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

  it("PDBP-USERS-VIEW-OWN-05 — Global Standard (pending or blocked) can VIEW only OWN", async () => {
    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);

    const superadminUserPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminUserPb.collection(usersCollectionName).create(superadminUserPayload);
    await superadminUserPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    const pendingStandardUserPb = createPbConnection();
    const pendingStandardUserPayload = userPayloadBuilder.forCreateRandomData();
    const pendingStandardUserRecord = await pendingStandardUserPb
      .collection(usersCollectionName)
      .create(pendingStandardUserPayload);
    await pendingStandardUserPb
      .collection(usersCollectionName)
      .authWithPassword(pendingStandardUserPayload.email, pendingStandardUserPayload.password);

    const blockedStandardUserPb = createPbConnection();
    const blockedStandardUserPayload = userPayloadBuilder.forCreateRandomData();
    const blockedStandardUserRecord = await blockedStandardUserPb
      .collection(usersCollectionName)
      .create(blockedStandardUserPayload);
    await blockedStandardUserPb
      .collection(usersCollectionName)
      .authWithPassword(blockedStandardUserPayload.email, blockedStandardUserPayload.password);

    const pendingStandardGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: pendingStandardUserRecord.id,
        role: "standard",
        status: "pending",
      });
    const blockedStandardGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: blockedStandardUserRecord.id,
        role: "standard",
        status: "blocked",
      });
    const pendingStandardGlobalUserPermissionsRecord = await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .create(pendingStandardGlobalUserPermissionsPayload);
    const blockedStandardGlobalUserPermissionsRecord = await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .create(blockedStandardGlobalUserPermissionsPayload);

    const globalUserPermissionsFullList = await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .getFullList();
    expect(globalUserPermissionsFullList.length).toBe(3);

    await expect(
      await pendingStandardUserPb
        .collection(globalUserPermissionsCollectionName)
        .getOne(pendingStandardGlobalUserPermissionsRecord.id),
    ).toMatchObject(pendingStandardGlobalUserPermissionsPayload);

    await expect(
      pendingStandardUserPb
        .collection(globalUserPermissionsCollectionName)
        .getOne(blockedStandardGlobalUserPermissionsRecord.id),
    ).rejects.toThrow();

    await expect(
      await blockedStandardUserPb
        .collection(globalUserPermissionsCollectionName)
        .getOne(blockedStandardGlobalUserPermissionsRecord.id),
    ).toMatchObject(blockedStandardGlobalUserPermissionsPayload);
    await expect(
      blockedStandardUserPb
        .collection(globalUserPermissionsCollectionName)
        .getOne(pendingStandardGlobalUserPermissionsRecord.id),
    ).rejects.toThrow();
  });

  it("PDBP-GUP-LIST-01 — Global Superadmin can LIST", async () => {
    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);

    const superadminUserPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminUserPb.collection(usersCollectionName).create(superadminUserPayload);
    await superadminUserPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    const superadminUserGlobalUserPermissionsList = await superadminUserPb
      .collection(globalUserPermissionsCollectionName)
      .getFullList();
    expect(superadminUserGlobalUserPermissionsList.length).toBe(1);
  });

  it("PDBP-GUP-LIST-02 — Global Admin (approved) can LIST", async () => {
    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);

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

    const adminGlobalUserPermissionsPayload = globalUserPermissionsPayloadBuilder.forCreateData({
      userId: adminUserRecord.id,
      role: "admin",
      status: "approved",
    });
    await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .create(adminGlobalUserPermissionsPayload);

    const adminUserGlobalUserPermissionsList = await adminUserPb
      .collection(globalUserPermissionsCollectionName)
      .getFullList();
    expect(adminUserGlobalUserPermissionsList.length).toBe(2);
  });

  it("PDBP-GUP-LIST-03 — Global Admin (pending or blocked) cannot LIST", async () => {
    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);

    const superadminUserPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminUserPb.collection(usersCollectionName).create(superadminUserPayload);
    await superadminUserPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    const pendingAdminUserPb = createPbConnection();
    const pendingAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const pendingAdminUserRecord = await pendingAdminUserPb
      .collection(usersCollectionName)
      .create(pendingAdminUserPayload);
    await pendingAdminUserPb
      .collection(usersCollectionName)
      .authWithPassword(pendingAdminUserPayload.email, pendingAdminUserPayload.password);

    const blockedAdminUserPb = createPbConnection();
    const blockedAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const blockedAdminUserRecord = await blockedAdminUserPb
      .collection(usersCollectionName)
      .create(blockedAdminUserPayload);
    await blockedAdminUserPb
      .collection(usersCollectionName)
      .authWithPassword(blockedAdminUserPayload.email, blockedAdminUserPayload.password);

    const pendingAdminGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: pendingAdminUserRecord.id,
        role: "admin",
        status: "pending",
      });
    const blockedAdminGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: blockedAdminUserRecord.id,
        role: "admin",
        status: "blocked",
      });
    const pendingAdminGlobalUserPermissionsRecord = await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .create(pendingAdminGlobalUserPermissionsPayload);
    const blockedAdminGlobalUserPermissionsRecord = await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .create(blockedAdminGlobalUserPermissionsPayload);

    const pendingAdminUserGlobalUserPermissionsList = await pendingAdminUserPb
      .collection(globalUserPermissionsCollectionName)
      .getFullList();
    expect(pendingAdminUserGlobalUserPermissionsList.length).toBe(1);
    expect(pendingAdminUserGlobalUserPermissionsList[0]).toMatchObject(
      pendingAdminGlobalUserPermissionsRecord,
    );
    const blockedAdminUserGlobalUserPermissionsList = await blockedAdminUserPb
      .collection(globalUserPermissionsCollectionName)
      .getFullList();
    expect(blockedAdminUserGlobalUserPermissionsList.length).toBe(1);
    expect(blockedAdminUserGlobalUserPermissionsList[0]).toMatchObject(
      blockedAdminGlobalUserPermissionsRecord,
    );
  });

  it("PDBP-GUP-LIST-04 — Global Standard (approved) can LIST", async () => {
    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);

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
    await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .create(standardGlobalUserPermissionsPayload);

    const standardUserGlobalUserPermissionsList = await standardUserPb
      .collection(globalUserPermissionsCollectionName)
      .getFullList();
    expect(standardUserGlobalUserPermissionsList.length).toBe(2);
  });

  it("PDBP-GUP-LIST-05 — Global Standard (pending or blocked) cannot LIST", async () => {
    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);

    const superadminUserPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminUserPb.collection(usersCollectionName).create(superadminUserPayload);
    await superadminUserPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    const pendingStandardUserPb = createPbConnection();
    const pendingStandardUserPayload = userPayloadBuilder.forCreateRandomData();
    const pendingStandardUserRecord = await pendingStandardUserPb
      .collection(usersCollectionName)
      .create(pendingStandardUserPayload);
    await pendingStandardUserPb
      .collection(usersCollectionName)
      .authWithPassword(pendingStandardUserPayload.email, pendingStandardUserPayload.password);

    const blockedStandardUserPb = createPbConnection();
    const blockedStandardUserPayload = userPayloadBuilder.forCreateRandomData();
    const blockedStandardUserRecord = await blockedStandardUserPb
      .collection(usersCollectionName)
      .create(blockedStandardUserPayload);
    await blockedStandardUserPb
      .collection(usersCollectionName)
      .authWithPassword(blockedStandardUserPayload.email, blockedStandardUserPayload.password);

    const pendingStandardGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: pendingStandardUserRecord.id,
        role: "standard",
        status: "pending",
      });
    const blockedStandardGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: blockedStandardUserRecord.id,
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

    const standardGlobalUserPermissionsRecord = globalUserPermissionsFullList.find(
      (record) => record.userId === pendingStandardUserRecord.id,
    );
    if (!standardGlobalUserPermissionsRecord)
      return expect(standardGlobalUserPermissionsRecord).toBeTruthy();

    const pendingStandardUserGlobalUserPermissionsList = await pendingStandardUserPb
      .collection(globalUserPermissionsCollectionName)
      .getFullList();
    expect(pendingStandardUserGlobalUserPermissionsList.length).toBe(1);
    const blockedStandardUserGlobalUserPermissionsList = await blockedStandardUserPb
      .collection(globalUserPermissionsCollectionName)
      .getFullList();
    expect(blockedStandardUserGlobalUserPermissionsList.length).toBe(1);
  });

  it("PDBP-GUP-LIST-OWN-01 — Global Superadmin can LIST OWN", async () => {
    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);

    const superadminUserPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminUserPb.collection(usersCollectionName).create(superadminUserPayload);
    await superadminUserPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    const superadminUserGlobalUserPermissionsList = await superadminUserPb
      .collection(globalUserPermissionsCollectionName)
      .getFullList();
    expect(superadminUserGlobalUserPermissionsList.length).toBe(1);
  });

  it("PDBP-GUP-LIST-OWN-02 — Global Admin (approved) can LIST OWN", async () => {
    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);

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

    const adminGlobalUserPermissionsPayload = globalUserPermissionsPayloadBuilder.forCreateData({
      userId: adminUserRecord.id,
      role: "admin",
      status: "approved",
    });
    await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .create(adminGlobalUserPermissionsPayload);

    const adminUserGlobalUserPermissionsList = await adminUserPb
      .collection(globalUserPermissionsCollectionName)
      .getFullList({ filter: `userId = "${adminUserRecord.id}"` });
    expect(adminUserGlobalUserPermissionsList.length).toBe(1);
  });

  it("PDBP-USERS-LIST-OWN-03 — Global Admin (pending or blocked) can LIST only OWN", async () => {
    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);

    const superadminUserPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminUserPb.collection(usersCollectionName).create(superadminUserPayload);
    await superadminUserPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    const pendingAdminUserPb = createPbConnection();
    const pendingAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const pendingAdminUserRecord = await pendingAdminUserPb
      .collection(usersCollectionName)
      .create(pendingAdminUserPayload);
    await pendingAdminUserPb
      .collection(usersCollectionName)
      .authWithPassword(pendingAdminUserPayload.email, pendingAdminUserPayload.password);

    const blockedAdminUserPb = createPbConnection();
    const blockedAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const blockedAdminUserRecord = await blockedAdminUserPb
      .collection(usersCollectionName)
      .create(blockedAdminUserPayload);
    await blockedAdminUserPb
      .collection(usersCollectionName)
      .authWithPassword(blockedAdminUserPayload.email, blockedAdminUserPayload.password);

    const pendingAdminGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: pendingAdminUserRecord.id,
        role: "admin",
        status: "pending",
      });
    const blockedAdminGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: blockedAdminUserRecord.id,
        role: "admin",
        status: "blocked",
      });
    await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .create(pendingAdminGlobalUserPermissionsPayload);
    await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .create(blockedAdminGlobalUserPermissionsPayload);

    const pendingAdminUserGlobalUserPermissionsList = await pendingAdminUserPb
      .collection(globalUserPermissionsCollectionName)
      .getFullList();
    expect(pendingAdminUserGlobalUserPermissionsList.length).toBe(1);

    const blockedAdminUserGlobalUserPermissionsList = await blockedAdminUserPb
      .collection(globalUserPermissionsCollectionName)
      .getFullList();
    expect(blockedAdminUserGlobalUserPermissionsList.length).toBe(1);
  });

  it("PDBP-GUP-LIST-OWN-04 — Global Standard (approved) can LIST OWN", async () => {
    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);

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
    await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .create(standardGlobalUserPermissionsPayload);

    const standardUserGlobalUserPermissionsList = await standardUserPb
      .collection(globalUserPermissionsCollectionName)
      .getFullList({ filter: `userId = "${standardUserRecord.id}"` });
    expect(standardUserGlobalUserPermissionsList.length).toBe(1);
  });

  it("PDBP-USERS-LIST-OWN-05 — Global Standard (pending or blocked) can LIST only OWN", async () => {
    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);

    const superadminUserPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminUserPb.collection(usersCollectionName).create(superadminUserPayload);
    await superadminUserPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    const pendingStandardUserPb = createPbConnection();
    const pendingStandardUserPayload = userPayloadBuilder.forCreateRandomData();
    const pendingStandardUserRecord = await pendingStandardUserPb
      .collection(usersCollectionName)
      .create(pendingStandardUserPayload);
    await pendingStandardUserPb
      .collection(usersCollectionName)
      .authWithPassword(pendingStandardUserPayload.email, pendingStandardUserPayload.password);

    const blockedStandardUserPb = createPbConnection();
    const blockedStandardUserPayload = userPayloadBuilder.forCreateRandomData();
    const blockedStandardUserRecord = await blockedStandardUserPb
      .collection(usersCollectionName)
      .create(blockedStandardUserPayload);
    await blockedStandardUserPb
      .collection(usersCollectionName)
      .authWithPassword(blockedStandardUserPayload.email, blockedStandardUserPayload.password);

    const pendingStandardGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: pendingStandardUserRecord.id,
        role: "standard",
        status: "pending",
      });
    const blockedStandardGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: blockedStandardUserRecord.id,
        role: "standard",
        status: "blocked",
      });
    await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .create(pendingStandardGlobalUserPermissionsPayload);
    await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .create(blockedStandardGlobalUserPermissionsPayload);

    const pendingStandardUserGlobalUserPermissionsList = await pendingStandardUserPb
      .collection(globalUserPermissionsCollectionName)
      .getFullList();
    expect(pendingStandardUserGlobalUserPermissionsList.length).toBe(1);
    const blockedStandardUserGlobalUserPermissionsList = await blockedStandardUserPb
      .collection(globalUserPermissionsCollectionName)
      .getFullList();
    expect(blockedStandardUserGlobalUserPermissionsList.length).toBe(1);
  });

  it("PDBP-GUP-UPDATE-01 — Global Superadmin can UPDATE", async () => {
    const superadminUserPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminUserPb.collection(usersCollectionName).create(superadminUserPayload);
    await superadminUserPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    const superadminUserGlobalUserPermissionsList = await superadminUserPb
      .collection(globalUserPermissionsCollectionName)
      .getFullList();

    const testUserPb = createPbConnection();
    const testUserPayload = userPayloadBuilder.forCreateRandomData();
    const testUserRecord = await testUserPb.collection(usersCollectionName).create(testUserPayload);
    await testUserPb
      .collection(usersCollectionName)
      .authWithPassword(testUserPayload.email, testUserPayload.password);

    const testGlobalUserPermissionsPayload1 = globalUserPermissionsPayloadBuilder.forCreateData({
      userId: testUserRecord.id,
      role: "standard",
      status: "pending",
    });
    const testGlobalUserPermissionsPayload2 = globalUserPermissionsPayloadBuilder.forCreateData({
      userId: testUserRecord.id,
      role: "admin",
      status: "approved",
    });
    const testGlobalUserPermissionsRecord1 = await superadminUserPb
      .collection(globalUserPermissionsCollectionName)
      .create(testGlobalUserPermissionsPayload1);
    expect(testGlobalUserPermissionsRecord1).toMatchObject(testGlobalUserPermissionsPayload1);

    const testGlobalUserPermissionsRecord2 = await superadminUserPb
      .collection(globalUserPermissionsCollectionName)
      .update(testGlobalUserPermissionsRecord1.id, testGlobalUserPermissionsPayload2);
    expect(testGlobalUserPermissionsRecord2).toMatchObject(testGlobalUserPermissionsPayload2);
  });

  it("PDBP-GUP-UPDATE-02 — Global Admin cannot UPDATE", async () => {
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

    const adminGlobalUserPermissionsPayload = globalUserPermissionsPayloadBuilder.forCreateData({
      userId: adminUserRecord.id,
      role: "admin",
      status: "approved",
    });
    await superadminUserPb
      .collection(globalUserPermissionsCollectionName)
      .create(adminGlobalUserPermissionsPayload);

    const testUserPb = createPbConnection();
    const testUserPayload = userPayloadBuilder.forCreateRandomData();
    const testUserRecord = await testUserPb.collection(usersCollectionName).create(testUserPayload);
    await testUserPb
      .collection(usersCollectionName)
      .authWithPassword(testUserPayload.email, testUserPayload.password);

    const testGlobalUserPermissionsPayload = globalUserPermissionsPayloadBuilder.forCreateData({
      userId: testUserRecord.id,
      role: "standard",
      status: "pending",
    });
    const testGlobalUserPermissionsRecord = await superadminUserPb
      .collection(globalUserPermissionsCollectionName)
      .create(testGlobalUserPermissionsPayload);
    expect(testGlobalUserPermissionsRecord).toMatchObject(testGlobalUserPermissionsPayload);

    await expect(
      adminUserPb
        .collection(globalUserPermissionsCollectionName)
        .update(testGlobalUserPermissionsRecord.id, testGlobalUserPermissionsPayload),
    ).rejects.toThrow();
  });

  it("PDBP-GUP-UPDATE-03 — Global Standard cannot UPDATE", async () => {
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
    await superadminUserPb
      .collection(globalUserPermissionsCollectionName)
      .create(standardGlobalUserPermissionsPayload);

    const testUserPb = createPbConnection();
    const testUserPayload = userPayloadBuilder.forCreateRandomData();
    const testUserRecord = await testUserPb.collection(usersCollectionName).create(testUserPayload);
    await testUserPb
      .collection(usersCollectionName)
      .authWithPassword(testUserPayload.email, testUserPayload.password);

    const testGlobalUserPermissionsPayload = globalUserPermissionsPayloadBuilder.forCreateData({
      userId: testUserRecord.id,
      role: "standard",
      status: "pending",
    });
    const testGlobalUserPermissionsRecord = await superadminUserPb
      .collection(globalUserPermissionsCollectionName)
      .create(testGlobalUserPermissionsPayload);
    expect(testGlobalUserPermissionsRecord).toMatchObject(testGlobalUserPermissionsPayload);

    await expect(
      standardUserPb
        .collection(globalUserPermissionsCollectionName)
        .update(testGlobalUserPermissionsRecord.id, testGlobalUserPermissionsPayload),
    ).rejects.toThrow();
  });

  it("PDBP-GUP-UPDATE-OWN-01 — Global Superadmin cannot UPDATE OWN", async () => {
    const superadminUserPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    const superadminUserRecord = await superadminUserPb
      .collection(usersCollectionName)
      .create(superadminUserPayload);
    await superadminUserPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    const newSuperadminGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: superadminUserRecord.id,
        role: "standard",
        status: "pending",
      });

    await expect(
      superadminUserPb
        .collection(globalUserPermissionsCollectionName)
        .update(superadminUserRecord.id, newSuperadminGlobalUserPermissionsPayload),
    ).rejects.toThrow();
  });

  it("PDBP-GUP-UPDATE-OWN-02 — Global Admin cannot UPDATE OWN", async () => {
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

    const adminGlobalUserPermissionsPayload = globalUserPermissionsPayloadBuilder.forCreateData({
      userId: adminUserRecord.id,
      role: "admin",
      status: "approved",
    });
    const adminGlobalUserPermissionsRecord = await superadminUserPb
      .collection(globalUserPermissionsCollectionName)
      .create(adminGlobalUserPermissionsPayload);

    const newAdminGlobalUserPermissionsPayload = globalUserPermissionsPayloadBuilder.forCreateData({
      userId: adminUserRecord.id,
      role: "admin",
      status: "pending",
    });

    await expect(
      adminUserPb
        .collection(globalUserPermissionsCollectionName)
        .update(adminGlobalUserPermissionsRecord.id, newAdminGlobalUserPermissionsPayload),
    ).rejects.toThrow();
  });

  it("PDBP-GUP-UPDATE-OWN-03 — Global Standard cannot UPDATE OWN", async () => {
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
    const standardGlobalUserPermissionsRecord = await superadminUserPb
      .collection(globalUserPermissionsCollectionName)
      .create(standardGlobalUserPermissionsPayload);

    const newStandardGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: standardUserRecord.id,
        role: "standard",
        status: "pending",
      });

    await expect(
      standardUserPb
        .collection(globalUserPermissionsCollectionName)
        .update(standardGlobalUserPermissionsRecord.id, newStandardGlobalUserPermissionsPayload),
    ).rejects.toThrow();
  });

  it("PDBP-GUP-DELETE-01 — Global Superadmin can DELETE", async () => {
    const superadminUserPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminUserPb.collection(usersCollectionName).create(superadminUserPayload);
    await superadminUserPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    const testUserPb = createPbConnection();
    const testUserPayload = userPayloadBuilder.forCreateRandomData();
    const testUserRecord = await testUserPb.collection(usersCollectionName).create(testUserPayload);
    await testUserPb
      .collection(usersCollectionName)
      .authWithPassword(testUserPayload.email, testUserPayload.password);

    const testGlobalUserPermissionsPayload = globalUserPermissionsPayloadBuilder.forCreateData({
      userId: testUserRecord.id,
      role: "standard",
      status: "pending",
    });
    const testGlobalUserPermissionsRecord = await superadminUserPb
      .collection(globalUserPermissionsCollectionName)
      .create(testGlobalUserPermissionsPayload);

    const deleteResp = await superadminUserPb
      .collection(globalUserPermissionsCollectionName)
      .delete(testGlobalUserPermissionsRecord.id);

    expect(deleteResp).toBe(true);
  });

  it("PDBP-GUP-DELETE-02 — Global Admin cannot DELETE", async () => {
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

    const adminGlobalUserPermissionsPayload = globalUserPermissionsPayloadBuilder.forCreateData({
      userId: adminUserRecord.id,
      role: "admin",
      status: "approved",
    });
    await superadminUserPb
      .collection(globalUserPermissionsCollectionName)
      .create(adminGlobalUserPermissionsPayload);

    const testUserPb = createPbConnection();
    const testUserPayload = userPayloadBuilder.forCreateRandomData();
    const testUserRecord = await testUserPb.collection(usersCollectionName).create(testUserPayload);
    await testUserPb
      .collection(usersCollectionName)
      .authWithPassword(testUserPayload.email, testUserPayload.password);

    const testGlobalUserPermissionsPayload = globalUserPermissionsPayloadBuilder.forCreateData({
      userId: testUserRecord.id,
      role: "standard",
      status: "pending",
    });
    const testGlobalUserPermissionsRecord = await superadminUserPb
      .collection(globalUserPermissionsCollectionName)
      .create(testGlobalUserPermissionsPayload);

    await expect(
      adminUserPb
        .collection(globalUserPermissionsCollectionName)
        .delete(testGlobalUserPermissionsRecord.id),
    ).rejects.toThrow();
  });

  it("PDBP-GUP-DELETE-03 — Global Standard cannot DELETE", async () => {
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
    await superadminUserPb
      .collection(globalUserPermissionsCollectionName)
      .create(standardGlobalUserPermissionsPayload);

    const testUserPb = createPbConnection();
    const testUserPayload = userPayloadBuilder.forCreateRandomData();
    const testUserRecord = await testUserPb.collection(usersCollectionName).create(testUserPayload);
    await testUserPb
      .collection(usersCollectionName)
      .authWithPassword(testUserPayload.email, testUserPayload.password);

    const testGlobalUserPermissionsPayload = globalUserPermissionsPayloadBuilder.forCreateData({
      userId: testUserRecord.id,
      role: "standard",
      status: "pending",
    });
    const testGlobalUserPermissionsRecord = await superadminUserPb
      .collection(globalUserPermissionsCollectionName)
      .create(testGlobalUserPermissionsPayload);

    await expect(
      standardUserPb
        .collection(globalUserPermissionsCollectionName)
        .delete(testGlobalUserPermissionsRecord.id),
    ).rejects.toThrow();
  });

  it("PDBP-GUP-DELETE-OWN-01 — Global Superadmin cannot DELETE OWN", async () => {
    const superadminUserPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    const superadminUserRecord = await superadminUserPb
      .collection(usersCollectionName)
      .create(superadminUserPayload);
    await superadminUserPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    await expect(
      superadminUserPb
        .collection(globalUserPermissionsCollectionName)
        .delete(superadminUserRecord.id),
    ).rejects.toThrow();
  });

  it("PDBP-GUP-DELETE-OWN-02 — Global Admin (approved) can DELETE OWN", async () => {
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

    const adminGlobalUserPermissionsPayload = globalUserPermissionsPayloadBuilder.forCreateData({
      userId: adminUserRecord.id,
      role: "admin",
      status: "approved",
    });
    const adminGlobalUserPermissionsRecord = await superadminUserPb
      .collection(globalUserPermissionsCollectionName)
      .create(adminGlobalUserPermissionsPayload);

    const deleteResp = await adminUserPb
      .collection(globalUserPermissionsCollectionName)
      .delete(adminGlobalUserPermissionsRecord.id);
    expect(deleteResp).toBe(true);
  });

  it("PDBP-USERS-DELETE-OWN-03 — Global Admin (pending or blocked) cannot DELETE OWN", async () => {
    const superadminUserPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminUserPb.collection(usersCollectionName).create(superadminUserPayload);
    await superadminUserPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

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
        role: "admin",
        status: "pending",
      });
    const pendingAdminGlobalUserPermissionsRecord = await superadminUserPb
      .collection(globalUserPermissionsCollectionName)
      .create(pendingAdminGlobalUserPermissionsPayload);

    await expect(
      pendingAdminUserPb
        .collection(globalUserPermissionsCollectionName)
        .delete(pendingAdminGlobalUserPermissionsRecord.id),
    ).rejects.toThrow();

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
        role: "admin",
        status: "blocked",
      });
    const blockedAdminGlobalUserPermissionsRecord = await superadminUserPb
      .collection(globalUserPermissionsCollectionName)
      .create(blockedAdminGlobalUserPermissionsPayload);

    await expect(
      blockedAdminUserPb
        .collection(globalUserPermissionsCollectionName)
        .delete(blockedAdminGlobalUserPermissionsRecord.id),
    ).rejects.toThrow();
  });

  it("PDBP-GUP-DELETE-OWN-04 — Global Standard (approved) can DELETE OWN", async () => {
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
    const standardGlobalUserPermissionsRecord = await superadminUserPb
      .collection(globalUserPermissionsCollectionName)
      .create(standardGlobalUserPermissionsPayload);

    const deleteResp = await standardUserPb
      .collection(globalUserPermissionsCollectionName)
      .delete(standardGlobalUserPermissionsRecord.id);

    expect(deleteResp).toBe(true);
  });

  it("PDBP-USERS-DELETE-OWN-05 — Global Standard (pending or blocked) cannot DELETE OWN", async () => {
    const superadminUserPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminUserPb.collection(usersCollectionName).create(superadminUserPayload);
    await superadminUserPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    const pendingStandardUserPb = createPbConnection();
    const pendingStandardUserPayload = userPayloadBuilder.forCreateRandomData();
    const pendingStandardUserRecord = await pendingStandardUserPb
      .collection(usersCollectionName)
      .create(pendingStandardUserPayload);
    await pendingStandardUserPb
      .collection(usersCollectionName)
      .authWithPassword(pendingStandardUserPayload.email, pendingStandardUserPayload.password);

    const pendingStandardGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: pendingStandardUserRecord.id,
        role: "standard",
        status: "pending",
      });
    const pendingStandardGlobalUserPermissionsRecord = await superadminUserPb
      .collection(globalUserPermissionsCollectionName)
      .create(pendingStandardGlobalUserPermissionsPayload);

    await expect(
      pendingStandardUserPb
        .collection(globalUserPermissionsCollectionName)
        .delete(pendingStandardGlobalUserPermissionsRecord.id),
    ).rejects.toThrow();

    const blockedStandardUserPb = createPbConnection();
    const blockedStandardUserPayload = userPayloadBuilder.forCreateRandomData();
    const blockedStandardUserRecord = await blockedStandardUserPb
      .collection(usersCollectionName)
      .create(blockedStandardUserPayload);
    await blockedStandardUserPb
      .collection(usersCollectionName)
      .authWithPassword(blockedStandardUserPayload.email, blockedStandardUserPayload.password);

    const blockedStandardGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: blockedStandardUserRecord.id,
        role: "standard",
        status: "blocked",
      });
    const blockedStandardGlobalUserPermissionsRecord = await superadminUserPb
      .collection(globalUserPermissionsCollectionName)
      .create(blockedStandardGlobalUserPermissionsPayload);

    await expect(
      blockedStandardUserPb
        .collection(globalUserPermissionsCollectionName)
        .delete(blockedStandardGlobalUserPermissionsRecord.id),
    ).rejects.toThrow();
  });
});
