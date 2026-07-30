import {
  clearDb,
  createPbLogFilePath,
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
import { testPortNumbers } from "./_testsMetadata";

const sourceBuildDirPath = "./source-build";

const testSuiteName = `pokkit-config-writer-settings-no-file-tests`;
const sandboxDirPath = `_sandboxes/${testSuiteName}`;

const sandboxDbPortNumber = testPortNumbers.pokkitDbConfigSyncSettingsNoFile;
const sandboxDbSuperuserEmail = "admin@admin.com";
const sandboxDbSuperuserPassword = "admin@admin.com";

let spawnProcess: ChildProcessWithoutNullStreams | undefined;
let sandboxDbUrl: string | undefined;

const createPbConnection = () => new PocketBase(sandboxDbUrl as string);

describe("pokkit-db config writer settings tests - when settings file does not exist", () => {
  beforeAll(async () => {
    await fse.removeSync(sandboxDirPath);
    await fse.copySync(sourceBuildDirPath, sandboxDirPath);
    await fse.removeSync(sandboxDirPath + "/pb_config/settings.json");

    const logFilePath = createPbLogFilePath({ dirPath: sandboxDirPath });

    const resp = await serveDb({
      dbBuildDirPath: sandboxDirPath,
      dbPortNumber: sandboxDbPortNumber,
      logFilePath,
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

  it("settings file is created on startup when it does not exist", async () => {
    const settingsFileContent = fse.readFileSync(
      sandboxDirPath + "/pb_config/settings.json",
      "utf8",
    );
    expect(settingsFileContent).toBeTruthy();

    const parsedSettings = safeJsonParse(settingsFileContent);
    expect(parsedSettings.success).toBe(true);
  });

  it("settings are synced to the file when they are updated", async () => {
    const superUserPb = createPbConnection();
    await superUserPb
      .collection(superusersCollectionName)
      .authWithPassword(sandboxDbSuperuserEmail, sandboxDbSuperuserPassword);

    const newAppName = "My New App Name";

    const updatedSettingsResp = await superUserPb.settings.update({
      meta: { appName: newAppName },
    });
    const updatedSettings = await superUserPb.settings.getAll();
    expect(updatedSettings.meta.appName).toBe(newAppName);

    const settingsFileContent = fse.readFileSync(
      sandboxDirPath + "/pb_config/settings.json",
      "utf8",
    );
    console.log({ settingsFileContent, updatedSettingsResp });
    expect(settingsFileContent).toBeTruthy();

    const parsedSettings = safeJsonParse(settingsFileContent);
    expect(parsedSettings.success).toBe(true);
    expect(parsedSettings.data.meta.appName).toBe(newAppName);
  });
});

const safeJsonParse = (str: string) => {
  try {
    const json = JSON.parse(str);
    return { success: true, data: json } as const;
  } catch (error) {
    return { success: false, error } as const;
  }
};
