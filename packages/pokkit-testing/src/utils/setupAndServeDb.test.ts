import { type ChildProcessWithoutNullStreams } from "child_process";
import fse from "fs-extra";
import PocketBase, { CollectionModel } from "pocketbase";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { clearDb } from "./clearDb";
import {
  killPocketbaseInstanceByDbUrl,
  killPocketbaseInstanceBySpawnProcess,
} from "../helpers/pbHelpers";
import { setupAndServeDb } from "./setupAndServeDb";

const sandboxedDbDirPath = `_temp/pocket-testing-health-check-2`;
const sandboxedDbBuildFilePath = `${sandboxedDbDirPath}/app-db`;
const sandboxedDbLogFilePath = `${sandboxedDbDirPath}/pocketbase.log`;
const sandboxedDbUrl = `http://0.0.0.0:8111`;
const dbSuperuserEmail = "admin@admin.com";
const dbSuperuserPassword = "admin@admin.com";

const createPbInstance = () => new PocketBase(sandboxedDbUrl);

let spawnProcess: ChildProcessWithoutNullStreams | undefined;

describe("pokkit-testing setupAndServeDb", () => {
  beforeAll(async () => {
    await killPocketbaseInstanceByDbUrl(sandboxedDbUrl);
    if (spawnProcess) await killPocketbaseInstanceBySpawnProcess(spawnProcess);

    spawnProcess = await setupAndServeDb({
      getCollectionsFn: async () => {
        const collectionsString = fse.readFileSync("./pocketbase/collections.json", "utf-8");
        return JSON.parse(collectionsString) as CollectionModel[];
      },
      writeDbBuildToFilePathFn: async () => {
        fse.ensureFileSync(sandboxedDbBuildFilePath);
        fse.copyFileSync(`./pocketbase/app-db`, sandboxedDbBuildFilePath);
      },
      dbUrl: sandboxedDbUrl,
      dbSuperuserEmail: dbSuperuserEmail,
      dbSuperuserPassword: dbSuperuserPassword,
      dbBuildFilePath: sandboxedDbBuildFilePath,
      dbLogFilePath: sandboxedDbLogFilePath,
    });
  });

  afterAll(async () => {
    if (spawnProcess) await killPocketbaseInstanceBySpawnProcess(spawnProcess);
    await killPocketbaseInstanceByDbUrl(sandboxedDbUrl);
    spawnProcess = undefined;

    fse.removeSync(sandboxedDbDirPath);
  });

  beforeEach(async () => {
    await clearDb({ dbUrl: sandboxedDbUrl, dbSuperuserEmail, dbSuperuserPassword });
  });

  it("successful health check", async () => {
    const userPb = createPbInstance();
    const resp = await userPb.health.check();
    expect(resp.code).toBe(200);
  });

  it("unsuccessful health check once terminated", async () => {
    if (spawnProcess) await killPocketbaseInstanceBySpawnProcess(spawnProcess);
    await killPocketbaseInstanceByDbUrl(sandboxedDbUrl);

    const userPb = createPbInstance();
    try {
      const resp = await userPb.health.check();
      expect(resp.code).not.toBe(200);
    } catch (error) {
      expect(error).toBeTruthy();
    }
  });
});
