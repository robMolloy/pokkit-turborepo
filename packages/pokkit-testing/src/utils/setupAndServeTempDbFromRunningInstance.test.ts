import { type ChildProcessWithoutNullStreams } from "child_process";
import fse from "fs-extra";
import PocketBase from "pocketbase";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { clearDatabase, killPocketbaseInstance, setupAndServeTempDbFromRunningInstance } from "./";

const tempDirPath = `_temp/pocket-testing-health-check`;
const tempDbUrl = `http://0.0.0.0:8111`;
const superuserEmail = "admin@admin.com";
const superuserPassword = "admin@admin.com";

const createPbInstance = () => new PocketBase(tempDbUrl);

let spawnProcess: ChildProcessWithoutNullStreams | undefined;

describe("pokkit-testing setupAndServeTempDbFromRunningInstance", () => {
  beforeAll(async () => {
    await spawnProcess?.kill("SIGTERM");
    spawnProcess = await setupAndServeTempDbFromRunningInstance({
      runningBuildFilePath: "../../apps/pokkit-whisper-db/builds/app-db",
      runningDbUrl: "http://0.0.0.0:8090",
      runningDbSuperuserEmail: superuserEmail,
      runningDbSuperuserPassword: superuserPassword,
      tempDbUrl,
      tempDirPath,
      tempDbSuperuserEmail: superuserEmail,
      tempDbSuperuserPassword: superuserPassword,
    });
  });

  afterAll(async () => {
    await spawnProcess?.kill("SIGTERM");
    spawnProcess = undefined;
    fse.removeSync(tempDirPath);

    killPocketbaseInstance(tempDbUrl);
  });

  beforeEach(async () => {
    await clearDatabase({
      dbUrl: tempDbUrl,
      dbSuperuserEmail: superuserEmail,
      dbSuperuserPassword: superuserPassword,
    });
  });

  it("successful health check", async () => {
    const userPb = createPbInstance();
    const resp = await userPb.health.check();
    expect(resp.code).toBe(200);
  });
  it("unsuccessful health check once terminated", async () => {
    await spawnProcess?.kill("SIGTERM");

    const userPb = createPbInstance();
    try {
      const resp = await userPb.health.check();
      expect(resp.code).not.toBe(200);
    } catch (error) {
      expect(error).toBeTruthy();
    }
  });
});
