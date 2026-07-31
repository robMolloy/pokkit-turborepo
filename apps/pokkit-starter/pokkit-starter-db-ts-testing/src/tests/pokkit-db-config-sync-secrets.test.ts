import {
  clearDb,
  killPocketbaseInstanceByDbPortNumber,
  serveDb,
  upsertAdminCredentialsFromCli,
} from "@repo/pokkit-testing";
import { safeJsonParse } from "@repo/pokkit-utils";
import fse from "fs-extra";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PocketBase } from "../config/pocketbaseConfig";
import { secretsCollectionName, superusersCollectionName } from "../metadata/pocketbaseMetadata";
import { testsMetadata } from "./_testsMetadata";

const sourceDirPath = "./source-build";

const testMetadata = testsMetadata.pokkitDbConfigSyncSecrets;
const testSuiteName = testMetadata.name;
const sandboxDbPortNumber = testMetadata.portNumber;

const sandboxDirPath = `_sandboxes/${testSuiteName}`;
const sandboxDbSuperuserEmail = "admin@admin.com";
const sandboxDbSuperuserPassword = "admin@admin.com";

let sandboxDbUrl: string | undefined;

const createPbConnection = () => new PocketBase(sandboxDbUrl as string);

describe("pokkit-db config writer secrets tests", () => {
  beforeAll(async () => {
    await killPocketbaseInstanceByDbPortNumber(sandboxDbPortNumber);
    await fse.removeSync(sandboxDirPath);
    await fse.copySync(sourceDirPath, sandboxDirPath);

    const resp = await serveDb({
      dbBuildDirPath: sandboxDirPath,
      dbPortNumber: sandboxDbPortNumber,
      logFilePath: `_logs/${testSuiteName}`,
    });

    sandboxDbUrl = resp.dbUrl;

    await upsertAdminCredentialsFromCli({
      buildDirPath: sandboxDirPath,
      dbSuperuserEmail: sandboxDbSuperuserEmail,
      dbSuperuserPassword: sandboxDbSuperuserPassword,
    });
  });

  afterAll(async () => {
    killPocketbaseInstanceByDbPortNumber(sandboxDbPortNumber);
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

  it("superuser can access _pb_config_secrets collection", async () => {
    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(sandboxDbSuperuserEmail, sandboxDbSuperuserPassword);

    await expect(await superuserPb.collection(secretsCollectionName).getFullList()).toEqual([]);
  });

  it("superuser can write to _pb_config_secrets collection which then updates the secrets file", async () => {
    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(sandboxDbSuperuserEmail, sandboxDbSuperuserPassword);

    const mockSecretRecord = { key: "testKey", value: "testValue" };

    await superuserPb.collection(secretsCollectionName).create(mockSecretRecord);

    const mockSecretRecords = await superuserPb.collection(secretsCollectionName).getFullList();
    const savedSecretRecord = mockSecretRecords.find((x) => x.key === mockSecretRecord.key);

    expect(savedSecretRecord?.value).toBe(mockSecretRecord.value);

    const secretsFileContent = fse.readFileSync(sandboxDirPath + "/pb_config/secrets.json", "utf8");
    expect(secretsFileContent).toBeTruthy();

    const parsedSecrets = safeJsonParse(secretsFileContent);
    expect(parsedSecrets.success).toBe(true);

    expect(parsedSecrets.data).toEqual({ [mockSecretRecord.key]: mockSecretRecord.value });
  });
});
