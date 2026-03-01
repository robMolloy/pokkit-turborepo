import { type ChildProcessWithoutNullStreams } from "child_process";
import fse from "fs-extra";
import PocketBase, { CollectionModel } from "pocketbase";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { clearDb } from "./clearDb";
import {
  killPocketbaseInstanceByDbServeUrl,
  killPocketbaseInstanceBySpawnProcess,
} from "../helpers/pbHelpers";
import { setupAndServeDb } from "./setupAndServeDb";

const tempDirPath = `_temp/pocket-testing-health-check-2`;
const tempDbBuildFilePath = `${tempDirPath}/app-db`;
const tempDbLogFilePath = `${tempDirPath}/pocketbase.log`;
const tempDbUrl = `http://0.0.0.0:8111`;
const dbSuperuserEmail = "admin@admin.com";
const dbSuperuserPassword = "admin@admin.com";

const createPbInstance = () => new PocketBase(tempDbUrl);

let spawnProcess: ChildProcessWithoutNullStreams | undefined;

describe("pokkit-testing setupAndServeDb", () => {
  beforeAll(async () => {
    await killPocketbaseInstanceByDbServeUrl(tempDbUrl);
    if (spawnProcess) await killPocketbaseInstanceBySpawnProcess(spawnProcess);

    spawnProcess = await setupAndServeDb({
      getCollectionsFn: async () => {
        const collectionsString = fse.readFileSync("./pocketbase/collections.json", "utf-8");
        return JSON.parse(collectionsString) as CollectionModel[];
      },
      writeDbBuildToFilePathFn: async () => {
        fse.ensureFileSync(tempDbBuildFilePath);
        fse.copyFileSync(`./pocketbase/app-db`, tempDbBuildFilePath);
      },
      dbUrl: tempDbUrl,
      dbSuperuserEmail: dbSuperuserEmail,
      dbSuperuserPassword: dbSuperuserPassword,
      dbBuildFilePath: tempDbBuildFilePath,
      dbLogFilePath: tempDbLogFilePath,
    });
  });

  afterAll(async () => {
    if (spawnProcess) await killPocketbaseInstanceBySpawnProcess(spawnProcess);
    await killPocketbaseInstanceByDbServeUrl(tempDbUrl);
    spawnProcess = undefined;

    fse.removeSync(tempDirPath);
  });

  beforeEach(async () => {
    await clearDb({ dbUrl: tempDbUrl, dbSuperuserEmail, dbSuperuserPassword });
  });

  it("successful health check", async () => {
    const userPb = createPbInstance();
    const resp = await userPb.health.check();
    expect(resp.code).toBe(200);
  });

  it("unsuccessful health check once terminated", async () => {
    if (spawnProcess) await killPocketbaseInstanceBySpawnProcess(spawnProcess);
    await killPocketbaseInstanceByDbServeUrl(tempDbUrl);

    const userPb = createPbInstance();
    try {
      const resp = await userPb.health.check();
      expect(resp.code).not.toBe(200);
    } catch (error) {
      expect(error).toBeTruthy();
    }
  });
});
