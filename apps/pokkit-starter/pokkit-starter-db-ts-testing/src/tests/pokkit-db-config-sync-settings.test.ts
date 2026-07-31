import {
  clearPb,
  createPbServeUrl,
  getPokkitDbSettingsFilePath,
  killPbInstance,
  servePb,
  upsertAdminCredentialsFromCli,
} from "@repo/pokkit-testing";
import { safeJsonParse } from "@repo/pokkit-utils";
import fse from "fs-extra";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PocketBase } from "../config/pocketbaseConfig";
import { superusersCollectionName } from "../metadata/pocketbaseMetadata";
import { superuserEmail, superuserPassword } from "./_constants";
import { testsMetadata } from "./_testsMetadata";
import { settingsMock } from "./mocks/settingsMock";

const sourceDirPath = "./source-build";

const testMetadata = testsMetadata.pokkitDbConfigSyncSettings;
const testSuiteName = testMetadata.name;

const pbPortNumber = testMetadata.portNumber;
const pbDirPath = `_sandboxes/${testSuiteName}`;
const pbFilePath = pbDirPath + "/app-db";

const pbServeUrl = createPbServeUrl({ pbPortNumber });

const createPbConnection = () => new PocketBase(pbServeUrl);

describe("pokkit-db config writer secrets tests", () => {
  beforeAll(async () => {
    await killPbInstance({ pbPortNumber });

    fse.removeSync(pbDirPath);
    fse.copySync(sourceDirPath, pbDirPath);

    await servePb({ pbFilePath, pbPortNumber, logFilePath: `_logs/${testSuiteName}` });

    await upsertAdminCredentialsFromCli({ pbFilePath, superuserEmail, superuserPassword });
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

  it("settings are synced to the file when they are updated", async () => {
    const superUserPb = createPbConnection();
    await superUserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);

    const newAppName = "My New App Name";

    await superUserPb.settings.update({ meta: { ...settingsMock.meta, appName: newAppName } });

    const updatedSettings = await superUserPb.settings.getAll();
    expect(updatedSettings.meta.appName).toBe(newAppName);

    const settingsFileContent = fse.readFileSync(
      getPokkitDbSettingsFilePath({ pbDirPath }),
      "utf8",
    );
    expect(settingsFileContent).toBeTruthy();

    const parsedSettings = safeJsonParse(settingsFileContent);
    expect(parsedSettings.success).toBe(true);
    expect((parsedSettings.data as any).meta.appName).toBe(newAppName);
  });
});
