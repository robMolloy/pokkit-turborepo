import {
  clearDb,
  killPbInstance,
  servePb,
  upsertAdminCredentialsFromCli,
} from "@repo/pokkit-testing";
import { safeJsonParse } from "@repo/pokkit-utils";
import fse from "fs-extra";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PocketBase } from "../config/pocketbaseConfig";
import { superusersCollectionName } from "../metadata/pocketbaseMetadata";
import { testSuperuser } from "./_constants";
import { testsMetadata } from "./_testsMetadata";
import { settingsMock } from "./mocks/settingsMock";

const sourceDirPath = "./source-build";

const testMetadata = testsMetadata.pokkitDbConfigSyncSettings;
const testSuiteName = testMetadata.name;

const pbPortNumber = testMetadata.portNumber;
const pbDirPath = `_sandboxes/${testSuiteName}`;
const pbFilePath = pbDirPath + "/app-db";

let sandboxDbUrl: string | undefined;

const createPbConnection = () => new PocketBase(sandboxDbUrl as string);

describe("pokkit-db config writer secrets tests", () => {
  beforeAll(async () => {
    await killPbInstance({ pbPortNumber });

    fse.removeSync(pbDirPath);
    fse.copySync(sourceDirPath, pbDirPath);

    const resp = await servePb({ pbFilePath, pbPortNumber, logFilePath: `_logs/${testSuiteName}` });
    sandboxDbUrl = resp.dbUrl;

    await upsertAdminCredentialsFromCli({
      pbFilePath,
      pbSuperuserEmail: testSuperuser.email,
      pbSuperuserPassword: testSuperuser.password,
    });
  });

  afterAll(async () => {
    killPbInstance({ pbPortNumber });
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

  it("settings are synced to the file when they are updated", async () => {
    const superUserPb = createPbConnection();
    await superUserPb
      .collection(superusersCollectionName)
      .authWithPassword(testSuperuser.email, testSuperuser.password);

    const newAppName = "My New App Name";

    await superUserPb.settings.update({ meta: { ...settingsMock.meta, appName: newAppName } });

    const updatedSettings = await superUserPb.settings.getAll();
    expect(updatedSettings.meta.appName).toBe(newAppName);

    const settingsFileContent = fse.readFileSync(pbDirPath + "/pb_config/settings.json", "utf8");
    expect(settingsFileContent).toBeTruthy();

    const parsedSettings = safeJsonParse(settingsFileContent);
    expect(parsedSettings.success).toBe(true);
    expect((parsedSettings.data as any).meta.appName).toBe(newAppName);
  });
});
