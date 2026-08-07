import {
  clearPb,
  getPbFilePath,
  getPbServeUrl,
  getPokkitDbCollectionsFilePath,
  globalUserPermissionsCollectionName,
  killPbInstance,
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

const testMetadata = testsMetadata.pokkitDbPermissionsGlobalUserPermissions;
const testSuiteName = testMetadata.name;

const pbPortNumber = testMetadata.portNumber;
const pbDirPath = `_sandboxes/${testSuiteName}`;
const pbFilePath = getPbFilePath({ pbDirPath });
const pbServeUrl = getPbServeUrl({ pbPortNumber });

const allowedRoles = ["standard", "admin", "superadmin"] as const;
const allowedStatuses = ["blocked", "approved", "pending"] as const;

const createPbConnection = () => new PocketBase(pbServeUrl);

const getField = (collection: CollectionModel, name: string) =>
  collection.fields.find((field) => field.name === name);

const authAsSuperuser = async () => {
  const superuserPb = createPbConnection();
  await superuserPb
    .collection(superusersCollectionName)
    .authWithPassword(superuserEmail, superuserPassword);
  return superuserPb;
};

const createUser = async () => {
  const userPb = createPbConnection();
  const payload = userPayloadBuilder.forCreateRandomData();
  const record = await userPb.collection(usersCollectionName).create(payload);
  return { userPb, payload, record };
};

describe(`${testSuiteName} tests`, () => {
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
    await clearPb({ pbPortNumber, superuserEmail, superuserPassword });
  });

  it("is connection healthy", async () => {
    const pb = createPbConnection();
    const isHealthy = await pb.health.check();
    expect(isHealthy.code).toBe(200);
  });

  it("GUP-01 — Collection fields", async () => {
    const superuserPb = await authAsSuperuser();
    const collection = await superuserPb.collections.getOne(globalUserPermissionsCollectionName);

    const userIdField = getField(collection, "userId");
    expect(userIdField?.type).toBe("relation");
    expect(userIdField).toMatchObject({ collectionId: "_pb_users_auth_" });

    const roleField = getField(collection, "role");
    expect(roleField?.type).toBe("select");
    expect(roleField).toMatchObject({ values: [...allowedRoles] });

    const statusField = getField(collection, "status");
    expect(statusField?.type).toBe("select");
    expect(statusField).toMatchObject({ values: [...allowedStatuses] });
  });

  it("GUP-02 — Role values", async () => {
    const superuserPb = await authAsSuperuser();

    for (const role of allowedRoles) {
      const { record: user } = await createUser();
      const permission = await superuserPb.collection(globalUserPermissionsCollectionName).create({
        userId: user.id,
        role,
        status: "approved",
      });
      expect(permission.role).toBe(role);
    }

    const { record: invalidRoleUser } = await createUser();
    await expect(
      superuserPb.collection(globalUserPermissionsCollectionName).create({
        userId: invalidRoleUser.id,
        role: "not-a-role",
        status: "approved",
      }),
    ).rejects.toThrow();
  });

  it("GUP-03 — Status values", async () => {
    const superuserPb = await authAsSuperuser();

    for (const status of allowedStatuses) {
      const { record: user } = await createUser();
      const permission = await superuserPb.collection(globalUserPermissionsCollectionName).create({
        userId: user.id,
        role: "standard",
        status,
      });
      expect(permission.status).toBe(status);
    }

    const { record: invalidStatusUser } = await createUser();
    await expect(
      superuserPb.collection(globalUserPermissionsCollectionName).create({
        userId: invalidStatusUser.id,
        role: "standard",
        status: "not-a-status",
      }),
    ).rejects.toThrow();
  });

  it("GUP-04 — Relation to users", async () => {
    const superuserPb = await authAsSuperuser();
    const { record: user } = await createUser();

    const permission = await superuserPb.collection(globalUserPermissionsCollectionName).create({
      userId: user.id,
      role: "standard",
      status: "approved",
    });
    expect(permission.userId).toBe(user.id);

    await expect(
      superuserPb.collection(globalUserPermissionsCollectionName).create({
        userId: "aaaaaaaaaaaaaaa",
        role: "standard",
        status: "approved",
      }),
    ).rejects.toThrow();

    await superuserPb.collection(usersCollectionName).delete(user.id);
    await expect(
      superuserPb.collection(globalUserPermissionsCollectionName).getOne(permission.id),
    ).rejects.toThrow();
  });

  it("GUP-05 — Assign roles with status lifecycle", async () => {
    const superuserPb = await authAsSuperuser();
    const { record: user } = await createUser();

    const permission = await superuserPb.collection(globalUserPermissionsCollectionName).create({
      userId: user.id,
      role: "standard",
      status: "pending",
    });
    expect(permission).toMatchObject({ role: "standard", status: "pending" });

    const approved = await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .update(permission.id, { status: "approved", role: "admin" });
    expect(approved).toMatchObject({ role: "admin", status: "approved" });

    const blocked = await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .update(permission.id, { status: "blocked", role: "superadmin" });
    expect(blocked).toMatchObject({ role: "superadmin", status: "blocked" });
  });
});
