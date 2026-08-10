import {
  truncatePbCollections,
  getPbFilePath,
  getPbServeUrl,
  getPokkitDbSettingsFilePath,
  killPbInstance,
  servePb,
  superusersCollectionName,
  upsertPbAdminCredentialsFromCli,
} from "@repo/pokkit-testing";
import fse from "fs-extra";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PocketBase } from "../../config/pocketbaseConfig";
import { sourceTestBuildDirPath, superuserEmail, superuserPassword } from "../_constants";
import { pokkitDbConfigSyncTestsMetadata } from "./_pokkitDbConfigSyncTestsMetadata";
import { validSettingsFileData } from "./mocks/validSettingsFileData";
import { safeJsonParse } from "@repo/pokkit-utils";

const testMetadata = pokkitDbConfigSyncTestsMetadata.settingsFileValid;
const testSuiteName = testMetadata.name;

const pbPortNumber = testMetadata.portNumber;
const pbDirPath = `_sandboxes/${testSuiteName}`;
const pbFilePath = getPbFilePath({ pbDirPath });
const pbServeUrl = getPbServeUrl({ pbPortNumber });
const logFilePath = `_logs/${testSuiteName}`;

const createPbConnection = () => new PocketBase(pbServeUrl);

let settingsFileContentsAtStart = "";

describe(`${testSuiteName} tests`, () => {
  beforeAll(async () => {
    await killPbInstance({ pbPortNumber });
    fse.removeSync(pbDirPath);
    fse.copySync(sourceTestBuildDirPath, pbDirPath);
    fse.removeSync(getPokkitDbSettingsFilePath({ pbDirPath }));
    fse.writeFileSync(
      getPokkitDbSettingsFilePath({ pbDirPath }),
      JSON.stringify(validSettingsFileData, null, 2),
    );

    settingsFileContentsAtStart = fse.readFileSync(
      getPokkitDbSettingsFilePath({ pbDirPath }),
      "utf8",
    );

    await servePb({ pbFilePath, pbPortNumber, logFilePath });
    await upsertPbAdminCredentialsFromCli({ pbFilePath, superuserEmail, superuserPassword });
  });

  afterAll(async () => {
    killPbInstance({ pbPortNumber });
    fse.removeSync(pbDirPath);
  });

  beforeEach(async () => {
    await truncatePbCollections({
      pbPortNumber,
      superuserEmail,
      superuserPassword,
      ignoreCollections: [superusersCollectionName],
    });
  });

  it("is connection healthy", async () => {
    const pb = createPbConnection();
    const isHealthy = await pb.health.check();
    expect(isHealthy.code).toBe(200);
  });

  it("PDBCS-SET-01 — Valid settings file imports on startup", async () => {
    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);
    const settings = await superuserPb.settings.getAll();
    expect(settings).toEqual(validSettingsFileData);
  });

  it("PDBCS-SET-05 — Valid settings file unchanged when already in sync", async () => {
    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);

    const settingsFileContents = fse.readFileSync(
      getPokkitDbSettingsFilePath({ pbDirPath }),
      "utf8",
    );
    expect(settingsFileContents).toEqual(settingsFileContentsAtStart);
  });

  it("PDBCS-SET-04 — When settings are changed at runtime, the settings file is updated", async () => {
    const newAppName = "NEW_APP_NAME";
    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);

    const settingsAtStart = await superuserPb.settings.getAll();
    expect(settingsAtStart).toEqual(validSettingsFileData);

    await superuserPb.settings.update({
      meta: { ...settingsAtStart.meta, appName: newAppName },
    });
    const settingsAtEnd = await superuserPb.settings.getAll();
    expect(settingsAtEnd.meta.appName).toEqual(newAppName);

    const settingsFileContents = fse.readFileSync(
      getPokkitDbSettingsFilePath({ pbDirPath }),
      "utf8",
    );
    const settingsFileContentsJson = safeJsonParse(settingsFileContents);
    expect(settingsFileContentsJson.success).toEqual(true);
    expect((settingsFileContentsJson.data as { meta: { appName: string } }).meta.appName).toEqual(
      newAppName,
    );
  });
});
