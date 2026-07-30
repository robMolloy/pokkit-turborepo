import {
  createPbLogFilePath,
  killPocketbaseInstanceByDbPortNumber,
  killPocketbaseInstanceBySpawnProcess,
  serveDb,
} from "@repo/pokkit-testing";
import type { ChildProcessWithoutNullStreams } from "child_process";
import fse from "fs-extra";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PocketBase } from "../config/pocketbaseConfig";
import { testPortNumbers } from "./_testsMetadata";

const sourceBuildDirPath = "./source-build";

const testSuiteName = `pokkit-db-config-sync-settings-error-file`;
const sandboxDirPath = `_sandboxes/${testSuiteName}`;

const sandboxDbPortNumber = testPortNumbers.pokkitDbConfigSyncSettingsErrorFile;

let spawnProcess: ChildProcessWithoutNullStreams | undefined;
let sandboxDbUrl: string | undefined;

const createPbConnection = () => new PocketBase(sandboxDbUrl as string);

describe("pokkit-db config writer settings tests - when settings file does not exist", () => {
  beforeAll(async () => {
    await fse.removeSync(sandboxDirPath);
    await fse.copySync(sourceBuildDirPath, sandboxDirPath);
    await fse.removeSync(sandboxDirPath + "/pb_config/settings.json");
    await fse.writeFileSync(sandboxDirPath + "/pb_config/settings.json", "error");

    const logFilePath = createPbLogFilePath({ dirPath: sandboxDirPath });

    const resp = await serveDb({
      dbBuildDirPath: sandboxDirPath,
      dbPortNumber: sandboxDbPortNumber,
      logFilePath,
    });

    spawnProcess = resp.pbProcess;
    sandboxDbUrl = resp.dbUrl;
  });

  afterAll(async () => {
    killPocketbaseInstanceByDbPortNumber(sandboxDbPortNumber);
    if (spawnProcess) killPocketbaseInstanceBySpawnProcess(spawnProcess);
    fse.removeSync(sandboxDirPath);
  });

  it("connection not healthy", async () => {
    const pb = createPbConnection();
    await expect(pb.health.check()).rejects.toThrow();
  });
});
