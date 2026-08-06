import {
  clearPb,
  getPbFilePath,
  getPbServeUrl,
  killPbInstance,
  pollLogsUntilNonZeroItems,
  pollLogsUntilNumberOfItemsChange,
  servePb,
  superusersCollectionName,
  upsertPbAdminCredentialsFromCli,
  usersCollectionName,
} from "@repo/pokkit-testing";
import fse from "fs-extra";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PocketBase } from "../config/pocketbaseConfig";
import { userPayloadBuilder } from "../utils/pocketbaseUserHelpers";
import { sourceTestBuildDirPath, superuserEmail, superuserPassword } from "./_constants";
import { testsMetadata } from "./_testsMetadata";

const testMetadata = testsMetadata.pokkitDbViewLogs;
const testSuiteName = testMetadata.name;

const pbPortNumber = testMetadata.portNumber;
const pbDirPath = `_sandboxes/${testSuiteName}`;
const pbFilePath = getPbFilePath({ pbDirPath });
const pbServeUrl = getPbServeUrl({ pbPortNumber });

const createPbConnection = () => new PocketBase(pbServeUrl);

describe("pokkit-db permissions no collections file tests", () => {
  beforeAll(async () => {
    await killPbInstance({ pbPortNumber });
    fse.removeSync(pbDirPath);
    fse.copySync(sourceTestBuildDirPath, pbDirPath);

    await servePb({ pbFilePath, pbPortNumber, logFilePath: `_logs/${testSuiteName}` });
    await upsertPbAdminCredentialsFromCli({ pbFilePath, superuserEmail, superuserPassword });

    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);

    const pollLogsResp = await pollLogsUntilNonZeroItems({
      pb: superuserPb,
      maxDurationMs: 8000,
      delayMs: 100,
    });

    expect(pollLogsResp.data?.totalItems).toBeGreaterThan(0);
  });

  afterAll(async () => {
    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);

    const pollLogsResp = await pollLogsUntilNonZeroItems({
      pb: superuserPb,
      maxDurationMs: 5000,
      delayMs: 200,
    });

    fse.writeFileSync(`_logs/${testSuiteName}.logsss.json`, JSON.stringify(pollLogsResp, null, 2));

    killPbInstance({ pbPortNumber });
    fse.removeSync(pbDirPath);
  });

  beforeEach(async () => {
    await clearPb({ pbPortNumber, superuserEmail, superuserPassword });
  });

  it("is connection healthy", async () => {
    const pb = createPbConnection();
    const isHealthy = await pb.health.check();
    expect(isHealthy.code).toBe(200);
  });

  // it("list logs", async () => {
  //   const superuserPb = createPbConnection();
  //   await superuserPb
  //     .collection(superusersCollectionName)
  //     .authWithPassword(superuserEmail, superuserPassword);

  //   const user1Pb = createPbConnection();
  //   const user1Data = userPayloadBuilder.forCreateRandomData();
  //   await user1Pb.collection(usersCollectionName).create({
  //     email: user1Data.email,
  //     password: user1Data.password,
  //     passwordConfirm: user1Data.password,
  //   });
  //   await user1Pb
  //     .collection(usersCollectionName)
  //     .authWithPassword(user1Data.email, user1Data.password);

  //   const user2Pb = createPbConnection();
  //   const user2Data = userPayloadBuilder.forCreateRandomData();
  //   const user2Record = await user2Pb.collection(usersCollectionName).create({
  //     email: user2Data.email,
  //     password: user2Data.password,
  //     passwordConfirm: user2Data.password,
  //   });
  //   await user2Pb
  //     .collection(usersCollectionName)
  //     .authWithPassword(user2Data.email, user2Data.password);

  //   const logsBeforeError = await superuserPb.logs.getList(1, 20, {});
  //   expect(logsBeforeError.items.length).toBeGreaterThan(0);

  //   const pollLogsUntilNumberOfItemsChangeRespPromise = pollLogsUntilNumberOfItemsChange({
  //     pb: superuserPb,
  //     maxDurationMs: 5000,
  //     delayMs: 200,
  //   });

  //   try {
  //     await user1Pb.collection(usersCollectionName).delete(user2Record.id);
  //   } catch {}
  //   const pollLogsUntilNumberOfItemsChangeResp = await pollLogsUntilNumberOfItemsChangeRespPromise;

  //   expect(pollLogsUntilNumberOfItemsChangeResp.success).toBe(true);

  //   const logsAfterError = await superuserPb.logs.getList(1, 20, {});
  //   expect(logsAfterError.items.length).toBeGreaterThan(0);
  //   expect(logsAfterError.items.length).toBeGreaterThan(logsBeforeError.items.length);
  // });
});
