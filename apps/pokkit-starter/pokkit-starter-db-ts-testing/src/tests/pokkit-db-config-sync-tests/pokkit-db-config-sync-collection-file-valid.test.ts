import { pokkitDbPermissionsCollectionNames } from "@repo/pokkit-db-permissions-ts-helpers";
import {
  getPbFilePath,
  getPbServeUrl,
  getPokkitDbCollectionsFilePath,
  killPbInstance,
  servePb,
  superusersCollectionName,
  truncatePbCollections,
  upsertPbAdminCredentialsFromCli,
} from "@repo/pokkit-testing";
import { safeJsonParse } from "@repo/pokkit-utils";
import fse from "fs-extra";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PocketBase } from "../../config/pocketbaseConfig";
import { sourceTestBuildDirPath, superuserEmail, superuserPassword } from "../_constants";
import { pokkitDbConfigSyncTestsMetadata } from "./_pokkitDbConfigSyncTestsMetadata";
import { validCollectionFileData } from "./mocks/validCollectionFileData";

const testMetadata = pokkitDbConfigSyncTestsMetadata.collectionFileValid;
const testSuiteName = testMetadata.name;

const pbPortNumber = testMetadata.portNumber;
const pbDirPath = `_sandboxes/${testSuiteName}`;
const pbFilePath = getPbFilePath({ pbDirPath });
const pbServeUrl = getPbServeUrl({ pbPortNumber });
const logFilePath = `_logs/${testSuiteName}`;

const createPbConnection = () => new PocketBase(pbServeUrl);

let collectionsFileContentsAtStart = "";

describe(`${testSuiteName} tests`, () => {
  beforeAll(async () => {
    await killPbInstance({ pbPortNumber });
    fse.removeSync(pbDirPath);
    fse.copySync(sourceTestBuildDirPath, pbDirPath);
    fse.removeSync(getPokkitDbCollectionsFilePath({ pbDirPath }));
    fse.writeFileSync(
      getPokkitDbCollectionsFilePath({ pbDirPath }),
      JSON.stringify(validCollectionFileData, null, 2),
    );

    collectionsFileContentsAtStart = fse.readFileSync(
      getPokkitDbCollectionsFilePath({ pbDirPath }),
      "utf8",
    );

    await servePb({ pbFilePath, pbPortNumber, logFilePath });
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

  it.todo("PDBCS-COL-01 — Valid collections file imports on startup", async () => {
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

    // todo: remove omit pokkit db permissions collections (as changed by pokkit db permissions)
    expect(
      collectionsWithoutDateTimes.filter(
        (collection) => !pokkitDbPermissionsCollectionNames.includes(collection.name),
      ),
    ).toEqual(
      validCollectionFileDataWithoutDateTimes.filter(
        (collection) => !pokkitDbPermissionsCollectionNames.includes(collection.name),
      ),
    );
  });

  it.todo("PDBCS-COL-02 - Valid collections file unchanged when already in sync", async () => {
    const collectionsFileContentsAtEnd = fse.readFileSync(
      getPokkitDbCollectionsFilePath({ pbDirPath }),
      "utf8",
    );
    expect(collectionsFileContentsAtEnd).toEqual(collectionsFileContentsAtStart);
  });
  it("PDBCS-COL-06 — Runtime collection change CRUD changes to collections file", async () => {
    const collectionName = "exampleCollection";
    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);

    await superuserPb.collections.create({ name: collectionName, type: "base" });
    const collections = await superuserPb.collections.getFullList();

    expect(collections.some((collection) => collection.name === collectionName)).toEqual(true);

    const afterCreate = fse.readFileSync(getPokkitDbCollectionsFilePath({ pbDirPath }), "utf8");
    const afterCreateParsedResp = safeJsonParse(afterCreate);
    expect(
      (afterCreateParsedResp.data as { name: string }[]).some(
        (collection) => collection.name === collectionName,
      ),
    ).toEqual(true);

    await superuserPb.collections.update(collectionName, {
      fields: [{ name: "status", type: "bool" }],
    });

    const afterUpdate = fse.readFileSync(getPokkitDbCollectionsFilePath({ pbDirPath }), "utf8");
    const afterUpdateParsedResp = safeJsonParse(afterUpdate);
    expect(
      (afterUpdateParsedResp.data as { name: string; fields: { name: string }[] }[])
        .find((collection) => collection.name === collectionName)
        ?.fields.some((field) => field.name === "status"),
    ).toEqual(true);

    await superuserPb.collections.delete(collectionName);

    const afterDelete = fse.readFileSync(getPokkitDbCollectionsFilePath({ pbDirPath }), "utf8");
    const afterDeleteParsedResp = safeJsonParse(afterDelete);
    expect(
      (afterDeleteParsedResp.data as { name: string }[]).some(
        (collection) => collection.name === collectionName,
      ),
    ).toEqual(false);
  });
});
