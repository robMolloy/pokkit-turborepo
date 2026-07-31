import {
  clearDb,
  killPocketbaseInstanceByDbPortNumber,
  servePb,
  upsertAdminCredentialsFromCli,
} from "@repo/pokkit-testing";
import { safeJsonParse } from "@repo/pokkit-utils";
import fse from "fs-extra";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PocketBase } from "../config/pocketbaseConfig";
import { secretsCollectionName, superusersCollectionName } from "../metadata/pocketbaseMetadata";
import { testsMetadata } from "./_testsMetadata";
import { testSuperuser } from "./_constants";

const sourceDirPath = "./source-build";

const testMetadata = testsMetadata.pokkitDbConfigSyncSecrets;
const testSuiteName = testMetadata.name;

const pbPortNumber = testMetadata.portNumber;
const pbDirPath = `_sandboxes/${testSuiteName}`;
const pbFilePath = pbDirPath + "/app-db";

let sandboxDbUrl: string | undefined;

const createPbConnection = () => new PocketBase(sandboxDbUrl as string);

describe("pokkit-db config writer secrets tests", () => {
  beforeAll(async () => {
    await killPocketbaseInstanceByDbPortNumber(pbPortNumber);
    await fse.removeSync(pbDirPath);
    await fse.copySync(sourceDirPath, pbDirPath);

    const resp = await servePb({ pbFilePath, pbPortNumber, logFilePath: `_logs/${testSuiteName}` });

    sandboxDbUrl = resp.dbUrl;

    await upsertAdminCredentialsFromCli({
      buildDirPath: pbDirPath,
      dbSuperuserEmail: testSuperuser.email,
      dbSuperuserPassword: testSuperuser.password,
    });
  });

  afterAll(async () => {
    killPocketbaseInstanceByDbPortNumber(pbPortNumber);
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

  it("superuser can access _pb_config_secrets collection", async () => {
    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(testSuperuser.email, testSuperuser.password);

    await expect(await superuserPb.collection(secretsCollectionName).getFullList()).toEqual([]);
  });

  it("superuser can write to _pb_config_secrets collection which then updates the secrets file", async () => {
    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(testSuperuser.email, testSuperuser.password);

    const mockSecretRecord = { key: "testKey", value: "testValue" };

    await superuserPb.collection(secretsCollectionName).create(mockSecretRecord);

    const mockSecretRecords = await superuserPb.collection(secretsCollectionName).getFullList();
    const savedSecretRecord = mockSecretRecords.find((x) => x.key === mockSecretRecord.key);

    expect(savedSecretRecord?.value).toBe(mockSecretRecord.value);

    const secretsFileContent = fse.readFileSync(pbDirPath + "/pb_config/secrets.json", "utf8");
    expect(secretsFileContent).toBeTruthy();

    const parsedSecrets = safeJsonParse(secretsFileContent);
    expect(parsedSecrets.success).toBe(true);

    expect(parsedSecrets.data).toEqual({ [mockSecretRecord.key]: mockSecretRecord.value });
  });
});
