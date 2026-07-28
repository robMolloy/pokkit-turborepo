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
import { superusersCollectionName, usersCollectionName } from "../metadata/pocketbaseMetadata";
import { userPayloadBuilder } from "../utils/pocketbaseUserHelpers";

const sourceBuildDirPath = "./source-build";

const testSuiteName = `pokkit-config-writer-collection-tests`;
const sandboxDirPath = `_sandboxes/${testSuiteName}`;

const sandboxDbPortNumber = 8114;
const sandboxDbSuperuserEmail = "admin@admin.com";
const sandboxDbSuperuserPassword = "admin@admin.com";

let spawnProcess: ChildProcessWithoutNullStreams | undefined;
let sandboxDbUrl: string | undefined;

const createPbConnection = () => new PocketBase(sandboxDbUrl as string);

describe("pokkit-db config writer collection tests", () => {
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

  it("does not reject a valid superuser authentication", async () => {
    const superuserPb = createPbConnection();
    const superuserRecordResponse = await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(sandboxDbSuperuserEmail, sandboxDbSuperuserPassword);

    expect(superuserRecordResponse.record.id).toBeTruthy();
  });

  it("random collection throws error", async () => {
    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(sandboxDbSuperuserEmail, sandboxDbSuperuserPassword);

    await expect(superuserPb.collection("randomCollectionName").getFullList()).rejects.toThrow();
  });

  it("authenticate superuser if wrong password gives 400", async () => {
    const superuserPb = createPbConnection();

    await expect(
      superuserPb
        .collection(superusersCollectionName)
        .authWithPassword(sandboxDbSuperuserEmail, "wrong-password"),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("allow create: user with valid email and password", async () => {
    const userPb = createPbConnection();

    // throwaway record - first user gains an approved admin global permission
    await userPb.collection(usersCollectionName).create(userPayloadBuilder.forCreateRandomData());

    const userData = userPayloadBuilder.forCreateRandomData();
    const resp = await userPb.collection(usersCollectionName).create({
      email: userData.email,
      password: userData.password,
      passwordConfirm: userData.password,
    });
    expect(resp.id).not.toBeNull();
  });

  it("when superuser creates a collection it writes to collection data to collection.json file and collection is acccessible by superuser", async () => {
    const newCollectionName = "blah321";

    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(sandboxDbSuperuserEmail, sandboxDbSuperuserPassword);

    const resp = await superuserPb.collections.create({ name: newCollectionName });
    expect(resp.name).toBe(newCollectionName);

    await expect(await superuserPb.collection(newCollectionName).getFullList()).toEqual([]);

    const collectionsFileBuffer = fse.readFileSync(`${sandboxDirPath}/pb_config/collections.json`);
    const collectionsFileStr = collectionsFileBuffer.toString();

    expect(collectionsFileStr.includes(`"name": "${newCollectionName}"`)).toBe(true);
  });
});
