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
import { sourcePbDirPath, superuserEmail, superuserPassword } from "./_constants";
import { testsMetadata } from "./_testsMetadata";

const testMetadata = testsMetadata.pokkitDbConfigSyncSecretsNoFile;
const testSuiteName = testMetadata.name;

const pbPortNumber = testMetadata.portNumber;
const pbDirPath = `_sandboxes/${testSuiteName}`;
const pbFilePath = getPbFilePath({ pbDirPath });

const pbServeUrl = getPbServeUrl({ pbPortNumber });

const createPbConnection = () => new PocketBase(pbServeUrl);

describe("pokkit-db config writer secrets tests - when secrets file does not exist", () => {
  beforeAll(async () => {
    await killPbInstance({ pbPortNumber });

    fse.removeSync(pbDirPath);
    fse.copySync(sourcePbDirPath, pbDirPath);
    fse.removeSync(getPokkitDbSecretsFilePath({ pbDirPath }));

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

  it("secrets file is created on startup when it does not exist", async () => {
    const secretsFileContent = fse.readFileSync(getPokkitDbSecretsFilePath({ pbDirPath }), "utf8");
    expect(secretsFileContent).toBeTruthy();

    const parsedSecrets = safeJsonParse(secretsFileContent);
    expect(parsedSecrets.success).toBe(true);
  });
});
