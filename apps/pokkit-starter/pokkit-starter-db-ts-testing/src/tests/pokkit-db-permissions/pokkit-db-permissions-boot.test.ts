import {
  clearPb,
  getPbFilePath,
  getPbServeUrl,
  getPokkitDbCollectionsFilePathh,
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
import type { CollectionField, CollectionModel } from "pocketbase";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PocketBase } from "../../config/pocketbaseConfig";
import { userPayloadBuilder } from "../../utils/pocketbaseUserHelpers";
import { sourceTestBuildDirPath, superuserEmail, superuserPassword } from "../_constants";
import { testsMetadata } from "../_testsMetadata";

const testMetadata = testsMetadata.pokkitDbPermissionsBootTests;
const testSuiteName = testMetadata.name;

const pbPortNumber = testMetadata.portNumber;
const pbDirPath = `_sandboxes/${testSuiteName}`;
const pbFilePath = getPbFilePath({ pbDirPath });
const pbServeUrl = getPbServeUrl({ pbPortNumber });
const collectionsFilePath = getPokkitDbCollectionsFilePathh({ pbDirPath });

const permissionCollectionNames = [
  globalUserPermissionsCollectionName,
  organisationsCollectionName,
  organisationUserPermissionsCollectionName,
] as const;

const createPbConnection = () => new PocketBase(pbServeUrl);

const authAsSuperuser = async () => {
  const pb = createPbConnection();
  await pb.collection(superusersCollectionName).authWithPassword(superuserEmail, superuserPassword);
  return pb;
};

const getField = (collection: CollectionModel, name: string) =>
  collection.fields.find((field) => field.name === name);

const expectSelectValues = (field: CollectionField | undefined, values: string[]) => {
  expect(field).toBeTruthy();
  expect(field?.type).toBe("select");
  expect(field?.values).toEqual(expect.arrayContaining(values));
  expect(field?.values).toHaveLength(values.length);
};

const expectPermissionCollectionsSchema = (collections: CollectionModel[]) => {
  const globalUserPermissions = collections.find(
    (collection) => collection.name === globalUserPermissionsCollectionName,
  );
  expect(globalUserPermissions).toBeTruthy();
  expect(getField(globalUserPermissions!, "userId")?.type).toBe("relation");
  expectSelectValues(getField(globalUserPermissions!, "role"), ["standard", "admin", "superadmin"]);
  expectSelectValues(getField(globalUserPermissions!, "status"), [
    "blocked",
    "approved",
    "pending",
  ]);

  const organisations = collections.find(
    (collection) => collection.name === organisationsCollectionName,
  );
  expect(organisations).toBeTruthy();
  expect(getField(organisations!, "name")?.type).toBe("text");
  expect(getField(organisations!, "description")?.type).toBe("text");

  const organisationUserPermissions = collections.find(
    (collection) => collection.name === organisationUserPermissionsCollectionName,
  );
  expect(organisationUserPermissions).toBeTruthy();
  expect(getField(organisationUserPermissions!, "userId")?.type).toBe("relation");
  expect(getField(organisationUserPermissions!, "orgId")?.type).toBe("relation");
  expect(getField(organisationUserPermissions!, "userOrgKey")?.type).toBe("text");
  expectSelectValues(getField(organisationUserPermissions!, "role"), ["standard", "admin"]);
  expectSelectValues(getField(organisationUserPermissions!, "status"), [
    "blocked",
    "approved",
    "pending",
  ]);
};

describe(`${testSuiteName} tests`, () => {
  describe("when collections.json is missing", () => {
    beforeAll(async () => {
      await killPbInstance({ pbPortNumber });
      fse.removeSync(pbDirPath);
      fse.copySync(sourceTestBuildDirPath, pbDirPath);
      fse.removeSync(collectionsFilePath);

      await servePb({ pbFilePath, pbPortNumber, logFilePath: `_logs/${testSuiteName}-missing` });
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

    it("BOOT-01 — Missing collections.json creates permission collections", async () => {
      const superuserPb = createPbConnection();
      await superuserPb
        .collection(superusersCollectionName)
        .authWithPassword(superuserEmail, superuserPassword);

      const collections = await superuserPb.collections.getFullList();

      for (const name of permissionCollectionNames) {
        expect(collections.find((collection) => collection.name === name)).toBeTruthy();
      }

      expectPermissionCollectionsSchema(collections);
    });

    it("BOOT-02 — Missing collections.json writes the file", async () => {
      expect(fse.existsSync(collectionsFilePath)).toBe(true);

      const collectionsFile = fse.readJsonSync(collectionsFilePath) as Array<{ name: string }>;
      console.log(
        JSON.stringify(
          collectionsFile.map((collection) => collection.name),
          null,
          2,
        ),
      );
      const names = collectionsFile.map((collection) => collection.name);

      expect(names).toContain(organisationsCollectionName);
      expect(names).toContain(organisationUserPermissionsCollectionName);
      expect(names).toContain(globalUserPermissionsCollectionName);
    });

    it("BOOT-04 — Users collection unchanged", async () => {
      const superuserPb = await authAsSuperuser();
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

  describe("when collections.json exists", () => {
    beforeAll(async () => {
      await killPbInstance({ pbPortNumber });
      fse.removeSync(pbDirPath);
      fse.copySync(sourceTestBuildDirPath, pbDirPath);
      expect(fse.existsSync(collectionsFilePath)).toBe(true);

      await servePb({ pbFilePath, pbPortNumber, logFilePath: `_logs/${testSuiteName}-existing` });
      await upsertPbAdminCredentialsFromCli({ pbFilePath, superuserEmail, superuserPassword });
    });

    afterAll(async () => {
      killPbInstance({ pbPortNumber });
      fse.removeSync(pbDirPath);
    });

    beforeEach(async () => {
      await clearPb({ pbPortNumber, superuserEmail, superuserPassword });
    });

    it("BOOT-03 — Existing collections.json is imported", async () => {
      const collectionsFile = fse.readJsonSync(collectionsFilePath) as Array<{
        id: string;
        name: string;
      }>;

      for (const name of permissionCollectionNames) {
        expect(collectionsFile.find((collection) => collection.name === name)).toBeTruthy();
      }

      const superuserPb = await authAsSuperuser();
      const collections = await superuserPb.collections.getFullList();

      for (const name of permissionCollectionNames) {
        const fromFile = collectionsFile.find((collection) => collection.name === name)!;
        const fromApi = collections.find((collection) => collection.name === name);
        expect(fromApi).toBeTruthy();
        expect(fromApi!.id).toBe(fromFile.id);
      }

      expectPermissionCollectionsSchema(collections);
    });
  });
});
