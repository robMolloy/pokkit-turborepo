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
import { testSuperuser } from "./_constants";
import { testsMetadata } from "./_testsMetadata";

const sourceDirPath = "./source-build";

const testMetadata = testsMetadata.pokkitDbConfigSyncSecretsNoFile;
const testSuiteName = testMetadata.name;

const pbPortNumber = testMetadata.portNumber;
const pbDirPath = `_sandboxes/${testSuiteName}`;
const pbFilePath = pbDirPath + "/app-db";

let sandboxDbUrl: string | undefined;

const createPbConnection = () => new PocketBase(sandboxDbUrl as string);

describe("pokkit-db config writer secrets tests - when secrets file does not exist", () => {
  beforeAll(async () => {
    await fse.removeSync(pbDirPath);
    await fse.copySync(sourceDirPath, pbDirPath);
    await fse.removeSync(pbDirPath + "/pb_config/secrets.json");

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

  it("secrets file is created on startup when it does not exist", async () => {
    const secretsFileContent = fse.readFileSync(pbDirPath + "/pb_config/secrets.json", "utf8");
    expect(secretsFileContent).toBeTruthy();

    const parsedSecrets = safeJsonParse(secretsFileContent);
    expect(parsedSecrets.success).toBe(true);
  });
});
