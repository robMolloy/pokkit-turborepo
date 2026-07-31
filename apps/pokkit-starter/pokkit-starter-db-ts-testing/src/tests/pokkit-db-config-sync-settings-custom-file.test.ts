import {
  clearDb,
  killPocketbaseInstanceByDbPortNumber,
  servePb,
  upsertAdminCredentialsFromCli,
} from "@repo/pokkit-testing";
import fse from "fs-extra";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PocketBase } from "../config/pocketbaseConfig";
import { superusersCollectionName } from "../metadata/pocketbaseMetadata";
import { testsMetadata } from "./_testsMetadata";
import { settingsMock } from "./mocks/settingsMock";
import { testSuperuser } from "./_constants";

const sourceDirPath = "./source-build";

const testMetadata = testsMetadata.pokkitDbConfigSyncSettingsCustomFile;
const testSuiteName = testMetadata.name;

const pbPortNumber = testMetadata.portNumber;
const pbDirPath = `_sandboxes/${testSuiteName}`;
const pbFilePath = pbDirPath + "/app-db";

let sandboxDbUrl: string | undefined;

const createPbConnection = () => new PocketBase(sandboxDbUrl as string);

describe("pokkit-db config writer settings tests - when settings file does not exist", () => {
  beforeAll(async () => {
    killPocketbaseInstanceByDbPortNumber(pbPortNumber);
    fse.removeSync(pbDirPath);
    fse.copySync(sourceDirPath, pbDirPath);
    fse.removeSync(pbDirPath + "/pb_config/settings.json");
    fse.writeFileSync(
      pbDirPath + "/pb_config/settings.json",
      JSON.stringify(settingsMock, null, 2),
    );

    const resp = await servePb({ pbFilePath, pbPortNumber, logFilePath: `_logs/${testSuiteName}` });

    sandboxDbUrl = resp.dbUrl;

    await upsertAdminCredentialsFromCli({
      buildDirPath: pbDirPath,
      dbSuperuserEmail: testSuperuser.email,
      dbSuperuserPassword: testSuperuser.password,
    });
  });

  afterAll(async () => {
    killPocketbaseInstanceByDbPortNumber(pbPortNumber);
    fse.removeSync(pbDirPath);
  });

  beforeEach(async () => {
    await clearDb({
      dbPortNumber: pbPortNumber,
      dbSuperuserEmail: testSuperuser.email,
      dbSuperuserPassword: testSuperuser.password,
    });
  });

  it("is connection healthy", async () => {
    const pb = createPbConnection();
    const isHealthy = await pb.health.check();
    expect(isHealthy.code).toBe(200);
  });

  it("settings file is being loaded on startup", async () => {
    const superUserPb = createPbConnection();
    await superUserPb
      .collection(superusersCollectionName)
      .authWithPassword(testSuperuser.email, testSuperuser.password);

    const settings = await superUserPb.settings.getAll();
    expect(settings).toEqual(settingsMock);
  });
});
