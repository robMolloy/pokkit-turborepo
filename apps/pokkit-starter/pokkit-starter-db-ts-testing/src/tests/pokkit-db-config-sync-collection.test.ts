import {
  clearPb,
  getPbFilePath,
  getPbServeUrl,
  getPokkitDbCollectionsFilePath,
  killPbInstance,
  servePb,
  upsertPbAdminCredentialsFromCli,
} from "@repo/pokkit-testing";
import fse from "fs-extra";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PocketBase } from "../config/pocketbaseConfig";
import { superusersCollectionName, usersCollectionName } from "../metadata/pocketbaseMetadata";
import { userPayloadBuilder } from "../utils/pocketbaseUserHelpers";
import { sourceTestBuildDirPath, superuserEmail, superuserPassword } from "./_constants";
import { testsMetadata } from "./_testsMetadata";

const testMetadata = testsMetadata.pokkitDbConfigSyncCollection;
const testSuiteName = testMetadata.name;

const pbPortNumber = testMetadata.portNumber;
const pbDirPath = `_sandboxes/${testSuiteName}`;
const pbFilePath = getPbFilePath({ pbDirPath });
const pbServeUrl = getPbServeUrl({ pbPortNumber });

const createPbConnection = () => new PocketBase(pbServeUrl);

describe("pokkit-db config writer collection tests", () => {
  beforeAll(async () => {
    await killPbInstance({ pbPortNumber });

    fse.removeSync(pbDirPath);
    fse.copySync(sourceTestBuildDirPath, pbDirPath);

    await servePb({ pbFilePath, pbPortNumber, logFilePath: `_logs/${testSuiteName}` });

    await upsertPbAdminCredentialsFromCli({ pbFilePath, superuserEmail, superuserPassword });
  });

  afterAll(async () => {
    killPbInstance({ pbPortNumber });
    fse.removeSync(pbDirPath);
  });

  beforeEach(async () => {
    await clearPb({ pbPortNumber, superuserEmail, superuserPassword });

    await upsertPbAdminCredentialsFromCli({ pbFilePath, superuserEmail, superuserPassword });
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
      .authWithPassword(superuserEmail, superuserPassword);

    expect(superuserRecordResponse.record.id).toBeTruthy();
  });

  it("random collection throws error", async () => {
    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);

    await expect(superuserPb.collection("randomCollectionName").getFullList()).rejects.toThrow();
  });

  it("authenticate superuser if wrong password gives 400", async () => {
    const superuserPb = createPbConnection();

    await expect(
      superuserPb
        .collection(superusersCollectionName)
        .authWithPassword(superuserEmail, "wrong-password"),
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
      .authWithPassword(superuserEmail, superuserPassword);

    const resp = await superuserPb.collections.create({ name: newCollectionName });
    expect(resp.name).toBe(newCollectionName);

    await expect(await superuserPb.collection(newCollectionName).getFullList()).toEqual([]);

    const collectionsFileStr = fse.readFileSync(
      getPokkitDbCollectionsFilePath({ pbDirPath }),
      "utf8",
    );

    expect(collectionsFileStr.includes(`"name": "${newCollectionName}"`)).toBe(true);
  });
});
