import {
  clearDb,
  killPocketbaseInstanceByDbPortNumber,
  serveDb,
  upsertAdminCredentialsFromCli,
} from "@repo/pokkit-testing";
import fse from "fs-extra";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PocketBase } from "../config/pocketbaseConfig";
import { superusersCollectionName } from "../metadata/pocketbaseMetadata";
import { testsMetadata } from "./_testsMetadata";
import { settingsMock } from "./mocks/settingsMock";

const sourceDirPath = "./source-build";

const testMetadata = testsMetadata.pokkitDbConfigSyncSettingsCustomFile;
const testSuiteName = testMetadata.name;
const sandboxDbPortNumber = testMetadata.portNumber;

const sandboxDirPath = `_sandboxes/${testSuiteName}`;

import { testSuperuser } from "./_constants";

let sandboxDbUrl: string | undefined;

const createPbConnection = () => new PocketBase(sandboxDbUrl as string);

describe("pokkit-db config writer settings tests - when settings file does not exist", () => {
  beforeAll(async () => {
    killPocketbaseInstanceByDbPortNumber(sandboxDbPortNumber);
    fse.removeSync(sandboxDirPath);
    fse.copySync(sourceDirPath, sandboxDirPath);
    fse.removeSync(sandboxDirPath + "/pb_config/settings.json");
    fse.writeFileSync(
      sandboxDirPath + "/pb_config/settings.json",
      JSON.stringify(settingsMock, null, 2),
    );

    const logFilePath = `_logs/${testSuiteName}`;

    const resp = await serveDb({
      dbBuildDirPath: sandboxDirPath,
      dbPortNumber: sandboxDbPortNumber,
      logFilePath,
    });

    sandboxDbUrl = resp.dbUrl;

    await upsertAdminCredentialsFromCli({
      buildDirPath: sandboxDirPath,
      dbSuperuserEmail: testSuperuser.email,
      dbSuperuserPassword: testSuperuser.password,
    });
  });

  afterAll(async () => {
    killPocketbaseInstanceByDbPortNumber(sandboxDbPortNumber);
    fse.removeSync(sandboxDirPath);
  });

  beforeEach(async () => {
    await clearDb({
      dbPortNumber: sandboxDbPortNumber,
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
