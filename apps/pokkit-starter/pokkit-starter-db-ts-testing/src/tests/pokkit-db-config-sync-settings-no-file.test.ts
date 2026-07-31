import {
  clearPb,
  getPbFilePath,
  getPbServeUrl,
  getPokkitDbSettingsFilePath,
  killPbInstance,
  servePb,
  upsertPbAdminCredentialsFromCli,
} from "@repo/pokkit-testing";
import { safeJsonParse } from "@repo/pokkit-utils";
import fse from "fs-extra";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PocketBase } from "../config/pocketbaseConfig";
import { superusersCollectionName } from "../metadata/pocketbaseMetadata";
import { sourcePbDirPath, superuserEmail, superuserPassword } from "./_constants";
import { testsMetadata } from "./_testsMetadata";

const testMetadata = testsMetadata.pokkitDbConfigSyncSettingsNoFile;
const testSuiteName = testMetadata.name;

const pbPortNumber = testMetadata.portNumber;
const pbDirPath = `_sandboxes/${testSuiteName}`;
const pbFilePath = getPbFilePath({ pbDirPath });

const pbServeUrl = getPbServeUrl({ pbPortNumber });
const pokkitDbSettingsFilePath = getPokkitDbSettingsFilePath({ pbDirPath });

const createPbConnection = () => new PocketBase(pbServeUrl);

describe("pokkit-db config writer settings tests - when settings file does not exist", () => {
  beforeAll(async () => {
    await killPbInstance({ pbPortNumber });

    fse.removeSync(pbDirPath);
    fse.copySync(sourcePbDirPath, pbDirPath);
    fse.removeSync(pokkitDbSettingsFilePath);

    await servePb({ pbFilePath, pbPortNumber, logFilePath: `_logs/${testSuiteName}` });

    await upsertPbAdminCredentialsFromCli({ pbFilePath, superuserEmail, superuserPassword });
  });

  afterAll(async () => {
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

  it("settings file is created on startup when it does not exist", async () => {
    const settingsFileContent = fse.readFileSync(pokkitDbSettingsFilePath, "utf8");
    expect(settingsFileContent).toBeTruthy();

    const parsedSettings = safeJsonParse(settingsFileContent);
    expect(parsedSettings.success).toBe(true);
  });

  it("settings are synced to the file when they are updated", async () => {
    const superUserPb = createPbConnection();
    await superUserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);

    const newAppName = "My New App Name";

    await superUserPb.settings.update({ meta: { appName: newAppName } });
    const updatedSettings = await superUserPb.settings.getAll();
    expect(updatedSettings.meta.appName).toBe(newAppName);

    const settingsFileContent = fse.readFileSync(pokkitDbSettingsFilePath, "utf8");
    expect(settingsFileContent).toBeTruthy();

    const parsedSettings = safeJsonParse(settingsFileContent);
    expect(parsedSettings.success).toBe(true);
    expect((parsedSettings.data as any).meta.appName).toBe(newAppName);
  });
});
