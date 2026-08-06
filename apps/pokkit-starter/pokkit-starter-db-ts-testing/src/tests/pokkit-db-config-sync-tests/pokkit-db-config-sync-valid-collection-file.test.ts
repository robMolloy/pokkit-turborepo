import {
  clearPb,
  getPbFilePath,
  getPbServeUrl,
  getPokkitDbCollectionsFilePathh,
  killPbInstance,
  servePb,
  superusersCollectionName,
  upsertPbAdminCredentialsFromCli,
} from "@repo/pokkit-testing";
import fse from "fs-extra";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PocketBase } from "../../config/pocketbaseConfig";
import { sourceTestBuildDirPath, superuserEmail, superuserPassword } from "../_constants";
import { pokkitDbConfigSyncTestsMetadata } from "./_pokkitDbConfigSyncTestsMetadata";
import { validCollectionFileData } from "./mocks/validCollectionFileData";

const testMetadata = pokkitDbConfigSyncTestsMetadata.validCollectionFile;
const testSuiteName = testMetadata.name;

const pbPortNumber = testMetadata.portNumber;
const pbDirPath = `_sandboxes/${testSuiteName}`;
const pbFilePath = getPbFilePath({ pbDirPath });
const pbServeUrl = getPbServeUrl({ pbPortNumber });

const createPbConnection = () => new PocketBase(pbServeUrl);

describe(`${testSuiteName} tests`, () => {
  beforeAll(async () => {
    await killPbInstance({ pbPortNumber });
    fse.removeSync(pbDirPath);
    fse.copySync(sourceTestBuildDirPath, pbDirPath);
    fse.removeSync(getPokkitDbCollectionsFilePathh({ pbDirPath }));
    fse.writeFileSync(
      getPokkitDbCollectionsFilePathh({ pbDirPath }),
      JSON.stringify(validCollectionFileData, null, 2),
    );

    await servePb({ pbFilePath, pbPortNumber, logFilePath: `_logs/${testSuiteName}` });
    await upsertPbAdminCredentialsFromCli({ pbFilePath, superuserEmail, superuserPassword });
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

  it("PDBCS-COL-01 — Valid collections file imports on startup", async () => {
    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);

    const collections = await superuserPb.collections.getFullList();

    const collectionsWithoutDateTimes = collections.map((collection) => {
      const { created: _created, updated: _updated, ...rest } = collection;
      return rest;
    });
    const validCollectionFileDataWithoutDateTimes = validCollectionFileData.map((collection) => {
      const { created: _created, updated: _updated, ...rest } = collection;
      return rest;
    });
    expect(collectionsWithoutDateTimes).toEqual(validCollectionFileDataWithoutDateTimes);
  });
});
