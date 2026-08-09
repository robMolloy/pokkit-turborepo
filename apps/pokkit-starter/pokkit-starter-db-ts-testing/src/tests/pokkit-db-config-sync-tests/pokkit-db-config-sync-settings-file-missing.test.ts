import {
  clearPb,
  getPbFilePath,
  getPbServeUrl,
  getPokkitDbSettingsFilePath,
  killPbInstance,
  servePb,
  superusersCollectionName,
  upsertPbAdminCredentialsFromCli,
} from "@repo/pokkit-testing";
import { safeJsonParse } from "@repo/pokkit-utils";
import fse from "fs-extra";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PocketBase } from "../../config/pocketbaseConfig";
import { sourceTestBuildDirPath, superuserEmail, superuserPassword } from "../_constants";
import { pokkitDbConfigSyncTestsMetadata } from "./_pokkitDbConfigSyncTestsMetadata";

const testMetadata = pokkitDbConfigSyncTestsMetadata.settingsFileMissing;
const testSuiteName = testMetadata.name;

const pbPortNumber = testMetadata.portNumber;
const pbDirPath = `_sandboxes/${testSuiteName}`;
const pbFilePath = getPbFilePath({ pbDirPath });
const pbServeUrl = getPbServeUrl({ pbPortNumber });
const logFilePath = `_logs/${testSuiteName}`;

const createPbConnection = () => new PocketBase(pbServeUrl);

// let settingsFileContentsAtStart = "";

describe(`${testSuiteName} tests`, () => {
  beforeAll(async () => {
    await killPbInstance({ pbPortNumber });
    fse.removeSync(pbDirPath);
    fse.copySync(sourceTestBuildDirPath, pbDirPath);
    fse.removeSync(getPokkitDbSettingsFilePath({ pbDirPath }));

    // settingsFileContentsAtStart = fse.readFileSync(
    //   getPokkitDbSettingsFilePath({ pbDirPath }),
    //   "utf8",
    // );

    await servePb({ pbFilePath, pbPortNumber, logFilePath });
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

  it("PDBCS-SET-03 — Missing settings file leaves settings unchanged", async () => {
    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);
    const settings = await superuserPb.settings.getAll();

    const settingsFileContents = fse.readFileSync(
      getPokkitDbSettingsFilePath({ pbDirPath }),
      "utf8",
    );
    const settingsFileContentsJson = safeJsonParse(settingsFileContents);
    expect(settingsFileContentsJson.success).toEqual(true);
    expect(settingsFileContentsJson.data).toEqual(settings);
  });
});
