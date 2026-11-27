import {
  getPbFilePath,
  getPbServeUrl,
  killPbInstance,
  migrateDown1,
  servePb,
  superusersCollectionName,
  truncatePbCollections,
} from "@repo/pokkit-testing";
import fse from "fs-extra";
import { beforeEach } from "node:test";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PocketBase } from "../config/pocketbaseConfig";
import { sourceTestBuildDirPath, superuserEmail, superuserPassword } from "./_testConstants";
import { testsContext } from "./_testsContext";

const testContext = testsContext.simpleTest;
const testSuiteName = testContext.name;

const pbPortNumber = testContext.portNumber;
const pbDirPath = `_sandboxes/${testSuiteName}`;
const pbFilePath = getPbFilePath({ pbDirPath });
const pbServeUrl = getPbServeUrl({ pbPortNumber });

const createPbConnection = () => new PocketBase(pbServeUrl);

describe("a", () => {
  beforeAll(async () => {
    await killPbInstance({ pbPortNumber });

    fse.removeSync(pbDirPath);
    fse.copySync(sourceTestBuildDirPath, pbDirPath);

    await servePb({ pbFilePath, pbPortNumber, logFilePath: `_logs/${testSuiteName}` });
  });

  afterAll(async () => {
    killPbInstance({ pbPortNumber });
    await fse.remove(pbDirPath);
  });

  beforeEach(async () => {
    await truncatePbCollections({
      pbPortNumber,
      superuserEmail,
      superuserPassword,
      ignoreCollections: [superusersCollectionName],
    });
  });

  it("is connection healthy", async () => {
    const pb = createPbConnection();
    const isHealthy = await pb.health.check();
    expect(isHealthy.code).toBe(200);
  });

  it("allows superuser to auth", async () => {
    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);
    expect(superuserPb.authStore.isValid).toBe(true);

    // await superuserPb
    //   .collection(superusersCollectionName)
    //   .create({ email: "newsuperuser@aol.com", password: "password", passwordConfirm: "password" });
  });

  it("allows second superuser to login but ", async () => {
    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);

    const superuser2Data = { email: "newsuperuser@aol.com", password: "password" };

    const resp = await superuserPb.collection(superusersCollectionName).create({
      email: superuser2Data.email,
      password: superuser2Data.password,
      passwordConfirm: superuser2Data.password,
    });

    expect(resp.id).toBeTruthy();

    superuserPb.authStore.clear();

    await migrateDown1({ pbFilePath });

    await expect(
      superuserPb
        .collection(superusersCollectionName)
        .authWithPassword(superuserEmail, superuserPassword),
    ).rejects.toThrow();

    const superuser2Pb = createPbConnection();
    await superuser2Pb
      .collection(superusersCollectionName)
      .authWithPassword(superuser2Data.email, superuser2Data.password);

    expect(superuser2Pb.authStore.isValid).toBe(true);
  });
});
