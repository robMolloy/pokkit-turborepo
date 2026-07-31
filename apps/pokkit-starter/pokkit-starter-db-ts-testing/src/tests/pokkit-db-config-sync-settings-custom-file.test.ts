import {
  clearPb,
  createPbServeUrl,
  killPbInstance,
  servePb,
  upsertAdminCredentialsFromCli,
} from "@repo/pokkit-testing";
import fse from "fs-extra";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PocketBase } from "../config/pocketbaseConfig";
import { superusersCollectionName } from "../metadata/pocketbaseMetadata";
import { superuserEmail, superuserPassword } from "./_constants";
import { testsMetadata } from "./_testsMetadata";
import { settingsMock } from "./mocks/settingsMock";

const sourceDirPath = "./source-build";

const testMetadata = testsMetadata.pokkitDbConfigSyncSettingsCustomFile;
const testSuiteName = testMetadata.name;

const pbPortNumber = testMetadata.portNumber;
const pbDirPath = `_sandboxes/${testSuiteName}`;
const pbFilePath = pbDirPath + "/app-db";

const pbServeUrl = createPbServeUrl({ pbPortNumber });

const createPbConnection = () => new PocketBase(pbServeUrl);

describe("pokkit-db config writer settings tests - when settings file does not exist", () => {
  beforeAll(async () => {
    await killPbInstance({ pbPortNumber });

    fse.removeSync(pbDirPath);
    fse.copySync(sourceDirPath, pbDirPath);
    fse.removeSync(pbDirPath + "/pb_config/settings.json");
    fse.writeFileSync(
      pbDirPath + "/pb_config/settings.json",
      JSON.stringify(settingsMock, null, 2),
    );

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

  it("settings file is being loaded on startup", async () => {
    const superUserPb = createPbConnection();
    await superUserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);

    const settings = await superUserPb.settings.getAll();
    expect(settings).toEqual(settingsMock);
  });
});
