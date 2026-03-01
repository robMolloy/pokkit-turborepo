import { type ChildProcessWithoutNullStreams } from "child_process";
import fse from "fs-extra";
import PocketBase from "pocketbase";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { clearDatabase } from "./clearDatabase";
import {
  killPocketbaseInstanceBySpawnProcess,
  killPocketbaseInstanceByDbServeUrl,
} from "../helpers/pbHelpers";
import { setupAndServeTempDbFromRunningInstance } from "./setupAndServeTempDbFromRunningInstance";

const tempDirPath = `_temp/pocket-testing-health-check`;
const tempDbLogFilePath = `${tempDirPath}/pocketbase.log`;
const tempDbBuildFilePath = `${tempDirPath}/app-db`;
const tempDbUrl = `http://0.0.0.0:8112`;
const dbSuperuserEmail = "admin@admin.com";
const dbSuperuserPassword = "admin@admin.com";

const createPbInstance = () => new PocketBase(tempDbUrl);

let spawnProcess: ChildProcessWithoutNullStreams | undefined;

describe("pokkit-testing setupAndServeTempDbFromRunningInstance", () => {
  beforeAll(async () => {
    await spawnProcess?.kill("SIGTERM");
    spawnProcess = await setupAndServeTempDbFromRunningInstance({
      runningBuildFilePath: "./pocketbase/app-db",
      runningDbUrl: "http://0.0.0.0:8090",
      runningDbSuperuserEmail: dbSuperuserEmail,
      runningDbSuperuserPassword: dbSuperuserPassword,
      tempDbUrl,
      tempDbLogFilePath,
      tempDbBuildFilePath,
      tempDbSuperuserEmail: dbSuperuserEmail,
      tempDbSuperuserPassword: dbSuperuserPassword,
    });
  });

  afterAll(async () => {
    if (spawnProcess) await killPocketbaseInstanceBySpawnProcess(spawnProcess);
    await killPocketbaseInstanceByDbServeUrl(tempDbUrl);
    spawnProcess = undefined;
    fse.removeSync(tempDirPath);
  });

  beforeEach(async () => {
    try {
      await clearDatabase({
        dbUrl: tempDbUrl,
        dbSuperuserEmail: dbSuperuserEmail,
        dbSuperuserPassword: dbSuperuserPassword,
      });
    } catch (error) {}
  });

  it("expects true to be true", () => {
    expect(true).toBe(true);
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
