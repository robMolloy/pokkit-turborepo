import {
  clearPb,
  getPbFilePath,
  getPbServeUrl,
  getPokkitDbCollectionsFilePath,
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

const testMetadata = pokkitDbConfigSyncTestsMetadata.missingCollectionFile;
const testSuiteName = testMetadata.name;

const pbPortNumber = testMetadata.portNumber;
const pbDirPath = `_sandboxes/${testSuiteName}`;
const pbFilePath = getPbFilePath({ pbDirPath });
const pbServeUrl = getPbServeUrl({ pbPortNumber });
const logFilePath = `_logs/${testSuiteName}`;

const createPbConnection = () => new PocketBase(pbServeUrl);

describe(`${testSuiteName} tests`, () => {
  beforeAll(async () => {
    await killPbInstance({ pbPortNumber });
    fse.removeSync(pbDirPath);
    fse.copySync(sourceTestBuildDirPath, pbDirPath);
    fse.removeSync(getPokkitDbCollectionsFilePath({ pbDirPath }));

    expect(fse.existsSync(getPokkitDbCollectionsFilePath({ pbDirPath }))).toBe(false);

    await servePb({ pbFilePath, pbPortNumber, logFilePath });
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

  it("PDBCS-COL-04 — Missing collections file exists once onServe finishes", async () => {
    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);

    expect(fse.existsSync(getPokkitDbCollectionsFilePath({ pbDirPath }))).toBe(true);
  });

  it("PDBCS-COL-05 - Missing collections file leaves DB collections in default state", async () => {
    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);
    const collections = await superuserPb.collections.getFullList();
    const collectionsFromFile = await fse.readJson(getPokkitDbCollectionsFilePath({ pbDirPath }));

    expect(collectionsFromFile).toEqual(collections);
  });
});
