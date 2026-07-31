import {
  clearPb,
  getPbFilePath,
  getPbServeUrl,
  getPokkitDbSecretsFilePath,
  killPbInstance,
  servePb,
  upsertPbAdminCredentialsFromCli,
} from "@repo/pokkit-testing";
import { safeJsonParse } from "@repo/pokkit-utils";
import fse from "fs-extra";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PocketBase } from "../config/pocketbaseConfig";
import { secretsCollectionName, superusersCollectionName } from "../metadata/pocketbaseMetadata";
import { sourcePbDirPath, superuserEmail, superuserPassword } from "./_constants";
import { testsMetadata } from "./_testsMetadata";

const testMetadata = testsMetadata.pokkitDbConfigSyncSecrets;
const testSuiteName = testMetadata.name;

const pbPortNumber = testMetadata.portNumber;
const pbDirPath = `_sandboxes/${testSuiteName}`;
const pbFilePath = getPbFilePath({ pbDirPath });

const pbServeUrl = getPbServeUrl({ pbPortNumber });

const createPbConnection = () => new PocketBase(pbServeUrl);

describe("pokkit-db config writer secrets tests", () => {
  beforeAll(async () => {
    await killPbInstance({ pbPortNumber });

    fse.removeSync(pbDirPath);
    fse.copySync(sourcePbDirPath, pbDirPath);

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

  it("superuser can access _pb_config_secrets collection", async () => {
    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);

    await expect(await superuserPb.collection(secretsCollectionName).getFullList()).toEqual([]);
  });

  it("superuser can write to _pb_config_secrets collection which then updates the secrets file", async () => {
    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);

    const mockSecretRecord = { key: "testKey", value: "testValue" };

    await superuserPb.collection(secretsCollectionName).create(mockSecretRecord);

    const mockSecretRecords = await superuserPb.collection(secretsCollectionName).getFullList();
    const savedSecretRecord = mockSecretRecords.find((x) => x.key === mockSecretRecord.key);

    expect(savedSecretRecord?.value).toBe(mockSecretRecord.value);

    const secretsFileContent = fse.readFileSync(getPokkitDbSecretsFilePath({ pbDirPath }), "utf8");
    expect(secretsFileContent).toBeTruthy();

    const parsedSecrets = safeJsonParse(secretsFileContent);
    expect(parsedSecrets.success).toBe(true);

    expect(parsedSecrets.data).toEqual({ [mockSecretRecord.key]: mockSecretRecord.value });
  });
});
