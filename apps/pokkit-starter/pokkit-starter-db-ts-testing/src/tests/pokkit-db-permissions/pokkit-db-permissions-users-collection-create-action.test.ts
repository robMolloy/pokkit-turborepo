import {
  getPbFilePath,
  getPbServeUrl,
  killPbInstance,
  pollPbLogsUntilNonZeroItems,
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

const globalUserPermissionsCollectionName = "globalUserPermissions";

const testMetadata = pokkitDbPermissionsTestsMetadata.usersCollectionCreateAction;
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
    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);

    const pollLogsResp = await pollPbLogsUntilNonZeroItems({
      pb: superuserPb,
      maxDurationMs: 10000,
      delayMs: 200,
    });

    expect(pollLogsResp.success).toBe(true);

    fse.writeFileSync(`${logFilePath}.json`, JSON.stringify(pollLogsResp.data, null, 2));

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

  it("PDBP-USERS-SETUP-01 — Verify collection presence and validity is setup correctly", async () => {
    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);

    const globalUserPermissionsCollection = superuserPb.collection(
      globalUserPermissionsCollectionName,
    );
    expect(globalUserPermissionsCollection).toBeTruthy();
  });

  it("PDBP-USERS-SETUP-02 — First user created is a global superadmin", async () => {
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

  it("PDBP-USERS-CREATE-01 — Global Superadmin can CREATE", async () => {
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

    try {
      const createGlobalUserPermissionsRecord = await superadminUserPb
        .collection(globalUserPermissionsCollectionName)
        .create({
          userId: standardUserRecord.record.id,
          role: "standard",
          status: "approved",
        });
      expect(createGlobalUserPermissionsRecord).toMatchObject({
        userId: standardUserRecord.record.id,
        role: "standard",
        status: "approved",
      });
    } catch (error) {
      console.log("error", error);
      expect(true).toBe(false);
    }
  });

  // it.todo("PDBP-USERS-CREATE-02 — Global Admin cannot CREATE", async () => {
  //   const superadminUserPb = createPbConnection();
  //   const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
  //   await superadminUserPb.collection(usersCollectionName).create(superadminUserPayload);
  //   const superadminUserRecord = await superadminUserPb
  //     .collection(usersCollectionName)
  //     .authWithPassword(superadminUserPayload.email, superadminUserPayload.passwordConfirm);

  //   const standardUserPb = createPbConnection();
  //   const standardUserPayload = userPayloadBuilder.forCreateRandomData();
  //   await standardUserPb.collection(usersCollectionName).create(standardUserPayload);
  //   const standardUserRecord = await standardUserPb
  //     .collection(usersCollectionName)
  //     .authWithPassword(standardUserPayload.email, standardUserPayload.passwordConfirm);

  //   superadminUserPb.collection(globalUserPermissionsCollectionName).create({
  //     userId: standardUserRecord.record.id,
  //     role: "standard",
  //     status: "approved",
  //   });
  // });

  // it.todo("PDBP-USERS-CREATE-03 — Global Standard cannot CREATE", async () => {});

  // it.todo("PDBP-USERS-CREATE-OWN-01 — Global Superadmin cannot CREATE OWN", async () => {});

  // it.todo("PDBP-USERS-CREATE-OWN-02 — Global Admin cannot CREATE OWN", async () => {});

  // it.todo("PDBP-USERS-CREATE-OWN-03 — Global Standard cannot CREATE OWN", async () => {});

  // it.todo("PDBP-USERS-VIEW-01 — Global Superadmin can VIEW", async () => {});

  // it.todo("PDBP-USERS-VIEW-02 — Global Admin (approved) can VIEW", async () => {});

  // it.todo("PDBP-USERS-VIEW-03 — Global Admin (pending or blocked) cannot VIEW", async () => {});

  // it.todo("PDBP-USERS-VIEW-04 — Global Standard (approved) can VIEW", async () => {});

  // it.todo("PDBP-USERS-VIEW-05 — Global Standard (pending or blocked) cannot VIEW", async () => {});

  // it.todo("PDBP-USERS-VIEW-OWN-01 — Global Superadmin can VIEW OWN", async () => {});

  // it.todo("PDBP-USERS-VIEW-OWN-02 — Global Admin (approved) can VIEW OWN", async () => {});

  // it.todo(
  //   "PDBP-USERS-VIEW-OWN-03 — Global Admin (pending or blocked) cannot VIEW OWN",
  //   async () => {},
  // );

  // it.todo("PDBP-USERS-VIEW-OWN-04 — Global Standard (approved) can VIEW OWN", async () => {});

  // it.todo(
  //   "PDBP-USERS-VIEW-OWN-05 — Global Standard (pending or blocked) cannot VIEW OWN",
  //   async () => {},
  // );

  // it.todo("PDBP-USERS-LIST-01 — Global Superadmin can LIST", async () => {});

  // it.todo("PDBP-USERS-LIST-02 — Global Admin (approved) can LIST", async () => {});

  // it.todo("PDBP-USERS-LIST-03 — Global Admin (pending or blocked) cannot LIST", async () => {});

  // it.todo("PDBP-USERS-LIST-04 — Global Standard (approved) can LIST", async () => {});

  // it.todo("PDBP-USERS-LIST-05 — Global Standard (pending or blocked) cannot LIST", async () => {});

  // it.todo("PDBP-USERS-LIST-OWN-01 — Global Superadmin can LIST OWN", async () => {});

  // it.todo("PDBP-USERS-LIST-OWN-02 — Global Admin (approved) can LIST OWN", async () => {});

  // it.todo(
  //   "PDBP-USERS-LIST-OWN-03 — Global Admin (pending or blocked) cannot LIST OWN",
  //   async () => {},
  // );

  // it.todo("PDBP-USERS-LIST-OWN-04 — Global Standard (approved) can LIST OWN", async () => {});

  // it.todo(
  //   "PDBP-USERS-LIST-OWN-05 — Global Standard (pending or blocked) cannot LIST OWN",
  //   async () => {},
  // );

  // it.todo("PDBP-USERS-UPDATE-01 — Global Superadmin can UPDATE", async () => {});

  // it.todo("PDBP-USERS-UPDATE-02 — Global Admin cannot UPDATE", async () => {});

  // it.todo("PDBP-USERS-UPDATE-03 — Global Standard cannot UPDATE", async () => {});

  // it.todo("PDBP-USERS-UPDATE-OWN-01 — Global Superadmin cannot UPDATE OWN", async () => {});

  // it.todo("PDBP-USERS-UPDATE-OWN-02 — Global Admin cannot UPDATE OWN", async () => {});

  // it.todo("PDBP-USERS-UPDATE-OWN-03 — Global Standard cannot UPDATE OWN", async () => {});

  // it.todo("PDBP-USERS-DELETE-01 — Global Superadmin can DELETE", async () => {});

  // it.todo("PDBP-USERS-DELETE-02 — Global Admin cannot DELETE", async () => {});

  // it.todo("PDBP-USERS-DELETE-03 — Global Standard cannot DELETE", async () => {});

  // it.todo("PDBP-USERS-DELETE-OWN-01 — Global Superadmin cannot DELETE OWN", async () => {});

  // it.todo("PDBP-USERS-DELETE-OWN-02 — Global Admin (approved) can DELETE OWN", async () => {});

  // it.todo(
  //   "PDBP-USERS-DELETE-OWN-03 — Global Admin (pending or blocked) cannot DELETE OWN",
  //   async () => {},
  // );

  // it.todo("PDBP-USERS-DELETE-OWN-04 — Global Standard (approved) can DELETE OWN", async () => {});

  // it.todo(
  //   "PDBP-USERS-DELETE-OWN-05 — Global Standard (pending or blocked) cannot DELETE OWN",
  //   async () => {},
  // );
});
