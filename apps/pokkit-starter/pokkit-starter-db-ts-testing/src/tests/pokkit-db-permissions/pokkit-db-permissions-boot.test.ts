import {
  truncatePbCollections,
  getPbFilePath,
  getPbServeUrl,
  getPokkitDbCollectionsFilePath,
  globalUserPermissionsCollectionName,
  killPbInstance,
  organisationsCollectionName,
  organisationUserPermissionsCollectionName,
  servePb,
  superusersCollectionName,
  upsertPbAdminCredentialsFromCli,
  usersCollectionName,
} from "@repo/pokkit-testing";
import fse from "fs-extra";
import type { CollectionModel } from "pocketbase";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PocketBase } from "../../config/pocketbaseConfig";
import { userPayloadBuilder } from "../../utils/pocketbaseUserHelpers";
import { sourceTestBuildDirPath, superuserEmail, superuserPassword } from "../_constants";
import { testsMetadata } from "../_testsMetadata";

const testMetadata = testsMetadata.pokkitDbPermissionsServeWithoutCollectionsFile;
const testSuiteName = testMetadata.name;

const pbPortNumber = testMetadata.portNumber;
const pbDirPath = `_sandboxes/${testSuiteName}`;
const pbFilePath = getPbFilePath({ pbDirPath });
const pbServeUrl = getPbServeUrl({ pbPortNumber });
const collectionsFilePath = getPokkitDbCollectionsFilePath({ pbDirPath });

const permissionCollectionNames = [
  globalUserPermissionsCollectionName,
  organisationsCollectionName,
  organisationUserPermissionsCollectionName,
] as const;

const createPbConnection = () => new PocketBase(pbServeUrl);

const getField = (collection: CollectionModel, name: string) =>
  collection.fields.find((field) => field.name === name);

describe(`${testSuiteName} tests`, () => {
  beforeAll(async () => {
    await killPbInstance({ pbPortNumber });
    fse.removeSync(pbDirPath);
    fse.copySync(sourceTestBuildDirPath, pbDirPath);
    fse.removeSync(collectionsFilePath);

    expect(fse.existsSync(collectionsFilePath)).toBe(false);

    await servePb({ pbFilePath, pbPortNumber, logFilePath: `_logs/${testSuiteName}-missing` });
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

  it("BOOT-01 — Missing collections.json creates permission collections", async () => {
    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);

    const collections = await superuserPb.collections.getFullList();

    for (const name of permissionCollectionNames) {
      expect(collections.find((collection) => collection.name === name)).toBeTruthy();
    }
  });

  it("BOOT-02 — Missing collections.json writes the file", async () => {
    expect(fse.existsSync(collectionsFilePath)).toBe(true);

    const collectionsFile = fse.readJsonSync(collectionsFilePath) as Array<{ name: string }>;
    const names = collectionsFile.map((collection) => collection.name);

    expect(names).toContain(organisationsCollectionName);
    expect(names).toContain(organisationUserPermissionsCollectionName);
    expect(names).toContain(globalUserPermissionsCollectionName);
  });

  it("BOOT-03 — Existing collections.json is imported", async () => {
    const collectionsFile = fse.readJsonSync(collectionsFilePath) as Array<{
      id: string;
      name: string;
    }>;

    for (const name of permissionCollectionNames) {
      expect(collectionsFile.find((collection) => collection.name === name)).toBeTruthy();
    }

    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);
    const collections = await superuserPb.collections.getFullList();

    for (const name of permissionCollectionNames) {
      const fromFile = collectionsFile.find((collection) => collection.name === name)!;
      const fromApi = collections.find((collection) => collection.name === name);
      expect(fromApi).toBeTruthy();
      expect(fromApi!.id).toBe(fromFile.id);
    }
  });

  it("BOOT-04 — Users collection unchanged", async () => {
    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);
    const usersCollection = await superuserPb.collections.getOne(usersCollectionName);

    expect(usersCollection.type).toBe("auth");
    expect(getField(usersCollection, "email")?.type).toBe("email");
    expect(getField(usersCollection, "password")?.type).toBe("password");

    const userPb = createPbConnection();
    const userPayload = userPayloadBuilder.forCreateRandomData();
    const created = await userPb.collection(usersCollectionName).create(userPayload);
    expect(created.id).toBeTruthy();

    const auth = await userPb
      .collection(usersCollectionName)
      .authWithPassword(userPayload.email, userPayload.password);
    expect(auth.record.id).toBe(created.id);
  });
});
