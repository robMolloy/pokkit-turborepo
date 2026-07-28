import {
  clearDb,
  createPbLogFilePath,
  killPocketbaseInstanceByDbUrl,
  killPocketbaseInstanceBySpawnProcess,
  setupAndServeDb as servePokkitDb,
  upsertAdminCredentials,
} from "@repo/pokkit-testing";
import type { ChildProcessWithoutNullStreams } from "child_process";
import fse from "fs-extra";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PocketBase } from "../config/pocketbaseConfig";
import { superusersCollectionName } from "../metadata/pocketbaseMetadata";

const sourceBuildDirPath = "./source-build";

const testSuiteName = `pokkit-config-writer-secrets-tests`;
const sandboxDirPath = `_sandboxes/${testSuiteName}`;

const sandboxDbPortNumber = 8115;
const sandboxDbSuperuserEmail = "admin@admin.com";
const sandboxDbSuperuserPassword = "admin@admin.com";

let spawnProcess: ChildProcessWithoutNullStreams | undefined;
let sandboxDbUrl: string | undefined;

const createPbConnection = () => new PocketBase(sandboxDbUrl as string);

describe("pokkit-db config writer secrets tests", () => {
  beforeAll(async () => {
    await fse.removeSync(sandboxDirPath);
    await fse.copySync(sourceBuildDirPath, sandboxDirPath);

    const resp = await servePokkitDb({
      dbBuildDirPath: sandboxDirPath,
      dbPortNumber: sandboxDbPortNumber,
      dbSuperuserEmail: sandboxDbSuperuserEmail,
      dbSuperuserPassword: sandboxDbSuperuserPassword,
    });

    spawnProcess = resp.pbProcess;
    sandboxDbUrl = resp.dbUrl;
  });

  afterAll(async () => {
    if (spawnProcess) killPocketbaseInstanceBySpawnProcess(spawnProcess);
    if (sandboxDbUrl) killPocketbaseInstanceByDbUrl(sandboxDbUrl);
    const logFilePath = createPbLogFilePath({ dirPath: sandboxDirPath });
    const storedLogsFilePath = `_logs/${testSuiteName}.logs.txt`;
    fse.copySync(logFilePath, storedLogsFilePath);
    fse.removeSync(sandboxDirPath);
  });

  beforeEach(async () => {
    await clearDb({
      dbPortNumber: sandboxDbPortNumber,
      dbSuperuserEmail: sandboxDbSuperuserEmail,
      dbSuperuserPassword: sandboxDbSuperuserPassword,
    });

    await upsertAdminCredentials({
      buildDirPath: sandboxDirPath,
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
    const secretsCollectionName = "_pb_config_secrets";

    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(sandboxDbSuperuserEmail, sandboxDbSuperuserPassword);

    await expect(await superuserPb.collection(secretsCollectionName).getFullList()).toEqual([]);
  });
});
