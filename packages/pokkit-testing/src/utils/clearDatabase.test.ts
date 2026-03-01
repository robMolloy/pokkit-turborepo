import { type ChildProcessWithoutNullStreams } from "child_process";
import fse from "fs-extra";
import PocketBase from "pocketbase";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { clearDatabase } from "./clearDatabase";
import { setupAndServeTempDbFromRunningInstance } from "./setupAndServeTempDbFromRunningInstance";
import { superusersCollectionName } from "../helpers/pbMetadata";
import {
  killPocketbaseInstanceByDbServeUrl,
  killPocketbaseInstanceBySpawnProcess,
} from "../helpers/pbHelpers";

const tempDirPath = `_temp/clear-database`;
const tempDbLogFilePath = `${tempDirPath}/pocketbase.log`;
const tempDbBuildFilePath = `${tempDirPath}/app-db`;
const tempDbUrl = `http://0.0.0.0:8113`;
const dbSuperuserEmail = "admin@admin.com";
const dbSuperuserPassword = "admin@admin.com";

const createPbInstance = () => new PocketBase(tempDbUrl);

let spawnProcess: ChildProcessWithoutNullStreams | undefined;

describe("pokkit-testing clearDatabase", () => {
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

  it("removes all users once the database is cleared", async () => {
    const superuserPb = createPbInstance();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(dbSuperuserEmail, dbSuperuserPassword);

    const userList0 = await superuserPb.collection("users").getFullList();
    expect(userList0.length).toBe(0);

    const userPb = createPbInstance();
    await userPb
      .collection("users")
      .create({ email: "new@user.com", password: "new@user.com", passwordConfirm: "new@user.com" });

    const userList1 = await superuserPb.collection("users").getFullList();
    expect(userList1.length).toBe(1);

    await clearDatabase({
      dbUrl: tempDbUrl,
      dbSuperuserEmail: dbSuperuserEmail,
      dbSuperuserPassword: dbSuperuserPassword,
    });

    const userList2 = await superuserPb.collection("users").getFullList();
    expect(userList2.length).toBe(0);
  });
});
