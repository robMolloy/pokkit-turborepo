import {
  clearPb,
  getPbFilePath,
  getPbServeUrl,
  getPokkitDbCollectionsFilePathh,
  globalUserPermissionsCollectionName,
  killPbInstance,
  servePb,
  superusersCollectionName,
  upsertPbAdminCredentialsFromCli,
  usersCollectionName,
} from "@repo/pokkit-testing";
import fse from "fs-extra";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PocketBase } from "../config/pocketbaseConfig";
import type { LogModel, ListResult } from "pocketbase";
import {
  sourcePbDirPath,
  // sourceUntouchedPbDirPath,
  superuserEmail,
  superuserPassword,
} from "./_constants";
import { testsMetadata } from "./_testsMetadata";
import { anyCrudActionIfStandardGlobalUserCollectionSchema } from "./mocks/anyCrudActionIfStandardGlobalUserCollectionSchema";
import { userPayloadBuilder } from "../utils/pocketbaseUserHelpers";
import { delay } from "@repo/pokkit-utils";

const anyCrudActionIfStandardGlobalUserCollectionName =
  "anyCrudActionIfStandardGlobalUserCollection";
const testMetadata = testsMetadata.pokkitDbPermissionsNoCollectionsFile;
const testSuiteName = testMetadata.name;

const pbPortNumber = testMetadata.portNumber;
const pbDirPath = `_sandboxes/${testSuiteName}`;
const pbFilePath = getPbFilePath({ pbDirPath });
const pbServeUrl = getPbServeUrl({ pbPortNumber });

const createPbConnection = () => new PocketBase(pbServeUrl);

describe("pokkit-db permissions no collections file tests", () => {
  beforeAll(async () => {
    await killPbInstance({ pbPortNumber });
    fse.removeSync(pbDirPath);
    fse.copySync(sourcePbDirPath, pbDirPath);
    fse.removeSync(getPokkitDbCollectionsFilePathh({ pbDirPath }));

    await servePb({ pbFilePath, pbPortNumber, logFilePath: `_logs/${testSuiteName}` });
    await upsertPbAdminCredentialsFromCli({ pbFilePath, superuserEmail, superuserPassword });

    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);
    try {
      await superuserPb.collections.create(anyCrudActionIfStandardGlobalUserCollectionSchema);
    } catch (error) {
      console.log(JSON.stringify(error, null, 2));
    }
  });

  afterAll(async () => {
    killPbInstance({ pbPortNumber });
    fse.removeSync(pbDirPath);
  });

  beforeEach(async () => {
    await clearPb({ pbPortNumber, superuserEmail, superuserPassword });
  });

  it("is connection healthy", async () => {
    const pb = createPbConnection();
    const isHealthy = await pb.health.check();
    expect(isHealthy.code).toBe(200);
  });

  // it("test that any standard global user can create,read,update and delete a record in the anyCrudActionIfStandardGlobalUserCollection", async () => {
  //   const superuserPb = createPbConnection();
  //   await superuserPb
  //     .collection(superusersCollectionName)
  //     .authWithPassword(superuserEmail, superuserPassword);

  //   const pb = createPbConnection();
  //   const user1Data = userPayloadBuilder.forCreateRandomData();
  //   const user1Record = await pb.collection(usersCollectionName).create({
  //     email: user1Data.email,
  //     password: user1Data.password,
  //     passwordConfirm: user1Data.password,
  //   });
  //   await pb.collection(usersCollectionName).authWithPassword(user1Data.email, user1Data.password);
  //   await superuserPb.collection(globalUserPermissionsCollectionName).create({
  //     userId: user1Record.id,
  //     role: "standard",
  //     status: "approved",
  //   });

  //   // try {
  //   //   await pb.collection(anyCrudActionIfStandardGlobalUserCollectionName).create({});
  //   // } catch (error) {
  //   //   console.log(JSON.stringify(error, null, 2));
  //   // }
  //   const createdRecord = await pb
  //     .collection(anyCrudActionIfStandardGlobalUserCollectionName)
  //     .create({ name: "test" });
  //   expect(createdRecord.id).toBeTruthy();
  //   expect(createdRecord.name).toBe("test");
  //   const readRecord = await pb
  //     .collection(anyCrudActionIfStandardGlobalUserCollectionName)
  //     .getOne(createdRecord.id);
  //   expect(readRecord).toBeTruthy();
  //   expect(readRecord.name).toBe("test");
  //   const updatedRecord = await pb
  //     .collection(anyCrudActionIfStandardGlobalUserCollectionName)
  //     .update(createdRecord.id, {
  //       name: "test2",
  //     });
  //   expect(updatedRecord).toBeTruthy();
  //   expect(updatedRecord.name).toBe("test2");
  //   const isDeleted = await pb
  //     .collection(anyCrudActionIfStandardGlobalUserCollectionName)
  //     .delete(createdRecord.id);
  //   expect(isDeleted).toBe(true);
  // });
});
