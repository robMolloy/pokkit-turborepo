import {
  clearDb,
  killPocketbaseInstanceByDbPortNumber,
  killPocketbaseInstanceBySpawnProcess,
  serveDb,
  upsertAdminCredentialsFromCli,
} from "@repo/pokkit-testing";
import type { ChildProcessWithoutNullStreams } from "child_process";
import fse from "fs-extra";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PocketBase } from "../config/pocketbaseConfig";
import { superusersCollectionName } from "../metadata/pocketbaseMetadata";
import { testsMetadata } from "./_testsMetadata";
import { settingsMock } from "./mocks/settingsMock";
import { safeJsonParse } from "@repo/pokkit-utils";

const sourceBuildDirPath = "./source-build";

const testMetadata = testsMetadata.pokkitDbConfigSyncSettings;
const testSuiteName = testMetadata.name;
const sandboxDbPortNumber = testMetadata.portNumber;
const sandboxDirPath = `_sandboxes/${testSuiteName}`;

const sandboxDbSuperuserEmail = "admin@admin.com";
const sandboxDbSuperuserPassword = "admin@admin.com";

let spawnProcess: ChildProcessWithoutNullStreams | undefined;
let sandboxDbUrl: string | undefined;

const createPbConnection = () => new PocketBase(sandboxDbUrl as string);

describe("pokkit-db config writer secrets tests", () => {
  beforeAll(async () => {
    await killPocketbaseInstanceByDbPortNumber(sandboxDbPortNumber);
    await fse.removeSync(sandboxDirPath);
    await fse.copySync(sourceBuildDirPath, sandboxDirPath);

    const resp = await serveDb({
      dbBuildDirPath: sandboxDirPath,
      dbPortNumber: sandboxDbPortNumber,
      logFilePath: `_logs/${testSuiteName}`,
    });

    spawnProcess = resp.pbProcess;
    sandboxDbUrl = resp.dbUrl;

    await upsertAdminCredentialsFromCli({
      buildDirPath: sandboxDirPath,
      dbSuperuserEmail: sandboxDbSuperuserEmail,
      dbSuperuserPassword: sandboxDbSuperuserPassword,
    });
  });

  afterAll(async () => {
    killPocketbaseInstanceByDbPortNumber(sandboxDbPortNumber);
    if (spawnProcess) killPocketbaseInstanceBySpawnProcess(spawnProcess);
    fse.removeSync(sandboxDirPath);
  });

  beforeEach(async () => {
    await clearDb({
      dbPortNumber: sandboxDbPortNumber,
      dbSuperuserEmail: sandboxDbSuperuserEmail,
      dbSuperuserPassword: sandboxDbSuperuserPassword,
    });
  });

  it("is connection healthy", async () => {
    const pb = createPbConnection();
    const isHealthy = await pb.health.check();
    expect(isHealthy.code).toBe(200);
  });

  it("settings are synced to the file when they are updated", async () => {
    const superUserPb = createPbConnection();
    await superUserPb
      .collection(superusersCollectionName)
      .authWithPassword(sandboxDbSuperuserEmail, sandboxDbSuperuserPassword);

    const newAppName = "My New App Name";

    await superUserPb.settings.update({ meta: { ...settingsMock.meta, appName: newAppName } });

    const updatedSettings = await superUserPb.settings.getAll();
    expect(updatedSettings.meta.appName).toBe(newAppName);

    const settingsFileContent = fse.readFileSync(
      sandboxDirPath + "/pb_config/settings.json",
      "utf8",
    );
    expect(settingsFileContent).toBeTruthy();

    const parsedSettings = safeJsonParse(settingsFileContent);
    expect(parsedSettings.success).toBe(true);
    expect((parsedSettings.data as any).meta.appName).toBe(newAppName);
  });
});
