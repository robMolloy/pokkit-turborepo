import {
  truncatePbCollections,
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
import { PocketBase } from "../config/pocketbaseConfig";
import { sourceTestBuildDirPath, superuserEmail, superuserPassword } from "./_constants";
import { testsMetadata } from "./_testsMetadata";
import {
  globalUserPermissionsCollectionName,
  organisationsCollectionName,
  organisationUserPermissionsCollectionName,
} from "@repo/pokkit-db-permissions-ts-helpers";

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
    fse.copySync(sourceTestBuildDirPath, pbDirPath);
    fse.removeSync(getPokkitDbCollectionsFilePath({ pbDirPath }));

    await servePb({ pbFilePath, pbPortNumber, logFilePath: `_logs/${testSuiteName}` });

    await upsertPbAdminCredentialsFromCli({ pbFilePath, superuserEmail, superuserPassword });
  });

  afterAll(async () => {
    killPbInstance({ pbPortNumber });
    fse.removeSync(pbDirPath);
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

  it("collections are merged from schema", async () => {
    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);

    const collections = await superuserPb.collections.getList();

    const globalUserPermissionsCollection = collections.items.find(
      (collection) => collection.name === globalUserPermissionsCollectionName,
    );
    expect(globalUserPermissionsCollection).toBeTruthy();

    const organisationUserPermissionsCollection = collections.items.find(
      (collection) => collection.name === organisationUserPermissionsCollectionName,
    );
    expect(organisationUserPermissionsCollection).toBeTruthy();

    const organisationsCollection = collections.items.find(
      (collection) => collection.name === organisationsCollectionName,
    );
    expect(organisationsCollection).toBeTruthy();
  });
});
