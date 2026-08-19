import {
  getPbFilePath,
  getPbServeUrl,
  killPbInstance,
  servePb,
  superusersCollectionName,
  truncatePbCollections,
  upsertPbAdminCredentialsFromCli,
} from "@repo/pokkit-testing";
import fse from "fs-extra";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PocketBase } from "../../config/pocketbaseConfig";
import { sourceTestBuildDirPath, superuserEmail, superuserPassword } from "../_constants";
import { pokkitDbBlogTestsMetadata } from "./_pokkitDbBlogTestsMetadata";
import {
  globalUserPermissionsCollectionName,
  globalUserPermissionsPayloadBuilder,
  userPayloadBuilder,
  usersCollectionName,
} from "@repo/pokkit-db-permissions-ts-helpers";
import { blogPostPayloadBuilder, blogPostsCollectionName } from "@repo/pokkit-db-blog-ts-helpers";

const testMetadata = pokkitDbBlogTestsMetadata.pokkitDbBlogPostImagesCollectionCreate;
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

    await servePb({ pbFilePath, pbPortNumber, logFilePath });
    await upsertPbAdminCredentialsFromCli({ pbFilePath, superuserEmail, superuserPassword });
  });

  afterAll(async () => {
    killPbInstance({ pbPortNumber });
    fse.removeSync(pbDirPath);
  }, 30000);

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

  it("PDB-BPI-CREATE-01 — Global Superadmin (approved) can CREATE", async () => {
    const superadminPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminPb.collection(usersCollectionName).create(superadminUserPayload);
    await superadminPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    const blogPostPayload = blogPostPayloadBuilder.forCreateRandomData();
    await expect(
      superadminPb.collection(blogPostsCollectionName).create(blogPostPayload),
    ).resolves.toMatchObject(blogPostPayload);
  });

  it("PDB-BPI-CREATE-02 — Global Superadmin (pending or blocked) cannot CREATE", async () => {
    const superadminPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminPb.collection(usersCollectionName).create(superadminUserPayload);
    await superadminPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    const pendingSuperadminPb = createPbConnection();
    const pendingSuperadminUserPayload = userPayloadBuilder.forCreateRandomData();
    const pendingSuperadminUserRecord = await pendingSuperadminPb
      .collection(usersCollectionName)
      .create(pendingSuperadminUserPayload);
    await pendingSuperadminPb
      .collection(usersCollectionName)
      .authWithPassword(pendingSuperadminUserPayload.email, pendingSuperadminUserPayload.password);
    const pendingSuperadminGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: pendingSuperadminUserRecord.id,
        role: "superadmin",
        status: "pending",
      });
    await superadminPb
      .collection(globalUserPermissionsCollectionName)
      .create(pendingSuperadminGlobalUserPermissionsPayload);

    const blockedSuperadminPb = createPbConnection();
    const blockedSuperadminUserPayload = userPayloadBuilder.forCreateRandomData();
    const blockedSuperadminUserRecord = await blockedSuperadminPb
      .collection(usersCollectionName)
      .create(blockedSuperadminUserPayload);
    await blockedSuperadminPb
      .collection(usersCollectionName)
      .authWithPassword(blockedSuperadminUserPayload.email, blockedSuperadminUserPayload.password);
    const blockedSuperadminGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: blockedSuperadminUserRecord.id,
        role: "superadmin",
        status: "blocked",
      });
    await superadminPb
      .collection(globalUserPermissionsCollectionName)
      .create(blockedSuperadminGlobalUserPermissionsPayload);

    const blogPostPayload = blogPostPayloadBuilder.forCreateRandomData();
    const testFn = (p: { pb: PocketBase }) =>
      p.pb.collection(blogPostsCollectionName).create(blogPostPayload);

    await expect(testFn({ pb: pendingSuperadminPb })).rejects.toThrow();
    await expect(testFn({ pb: blockedSuperadminPb })).rejects.toThrow();
    await expect(testFn({ pb: superadminPb })).resolves.toMatchObject(blogPostPayload);
  });

  it("PDB-BPI-CREATE-03 — Global Admin (approved) can CREATE", async () => {
    const superadminPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminPb.collection(usersCollectionName).create(superadminUserPayload);
    await superadminPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    const approvedAdminPb = createPbConnection();
    const approvedAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const approvedAdminUserRecord = await approvedAdminPb
      .collection(usersCollectionName)
      .create(approvedAdminUserPayload);
    await approvedAdminPb
      .collection(usersCollectionName)
      .authWithPassword(approvedAdminUserPayload.email, approvedAdminUserPayload.password);
    const approvedAdminGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: approvedAdminUserRecord.id,
        role: "admin",
        status: "approved",
      });
    await superadminPb
      .collection(globalUserPermissionsCollectionName)
      .create(approvedAdminGlobalUserPermissionsPayload);

    const blogPostPayload = blogPostPayloadBuilder.forCreateRandomData();
    await expect(
      approvedAdminPb.collection(blogPostsCollectionName).create(blogPostPayload),
    ).resolves.toMatchObject(blogPostPayload);
  });

  it("PDB-BPI-CREATE-04 — Global Admin (pending or blocked) cannot CREATE", async () => {
    const superadminPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminPb.collection(usersCollectionName).create(superadminUserPayload);
    await superadminPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    const pendingAdminPb = createPbConnection();
    const pendingAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const pendingAdminUserRecord = await pendingAdminPb
      .collection(usersCollectionName)
      .create(pendingAdminUserPayload);
    await pendingAdminPb
      .collection(usersCollectionName)
      .authWithPassword(pendingAdminUserPayload.email, pendingAdminUserPayload.password);
    const pendingAdminGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: pendingAdminUserRecord.id,
        role: "admin",
        status: "pending",
      });
    await superadminPb
      .collection(globalUserPermissionsCollectionName)
      .create(pendingAdminGlobalUserPermissionsPayload);

    const blockedAdminPb = createPbConnection();
    const blockedAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const blockedAdminUserRecord = await blockedAdminPb
      .collection(usersCollectionName)
      .create(blockedAdminUserPayload);
    await blockedAdminPb
      .collection(usersCollectionName)
      .authWithPassword(blockedAdminUserPayload.email, blockedAdminUserPayload.password);
    const blockedAdminGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: blockedAdminUserRecord.id,
        role: "admin",
        status: "blocked",
      });
    await superadminPb
      .collection(globalUserPermissionsCollectionName)
      .create(blockedAdminGlobalUserPermissionsPayload);

    const blogPostPayload = blogPostPayloadBuilder.forCreateRandomData();
    const testFn = (p: { pb: PocketBase }) =>
      p.pb.collection(blogPostsCollectionName).create(blogPostPayload);

    await expect(testFn({ pb: pendingAdminPb })).rejects.toThrow();
    await expect(testFn({ pb: blockedAdminPb })).rejects.toThrow();
    await expect(testFn({ pb: superadminPb })).resolves.toMatchObject(blogPostPayload);
  });

  it("PDB-BPI-CREATE-05 — Global Standard (approved, pending or blocked) cannot CREATE", async () => {
    const superadminPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminPb.collection(usersCollectionName).create(superadminUserPayload);
    await superadminPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    const approvedStandardPb = createPbConnection();
    const approvedStandardUserPayload = userPayloadBuilder.forCreateRandomData();
    const approvedStandardUserRecord = await approvedStandardPb
      .collection(usersCollectionName)
      .create(approvedStandardUserPayload);
    await approvedStandardPb
      .collection(usersCollectionName)
      .authWithPassword(approvedStandardUserPayload.email, approvedStandardUserPayload.password);
    const approvedStandardGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: approvedStandardUserRecord.id,
        role: "standard",
        status: "approved",
      });
    await superadminPb
      .collection(globalUserPermissionsCollectionName)
      .create(approvedStandardGlobalUserPermissionsPayload);

    const pendingStandardPb = createPbConnection();
    const pendingStandardUserPayload = userPayloadBuilder.forCreateRandomData();
    const pendingStandardUserRecord = await pendingStandardPb
      .collection(usersCollectionName)
      .create(pendingStandardUserPayload);
    await pendingStandardPb
      .collection(usersCollectionName)
      .authWithPassword(pendingStandardUserPayload.email, pendingStandardUserPayload.password);
    const pendingStandardGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: pendingStandardUserRecord.id,
        role: "standard",
        status: "pending",
      });
    await superadminPb
      .collection(globalUserPermissionsCollectionName)
      .create(pendingStandardGlobalUserPermissionsPayload);

    const blockedStandardPb = createPbConnection();
    const blockedStandardUserPayload = userPayloadBuilder.forCreateRandomData();
    const blockedStandardUserRecord = await blockedStandardPb
      .collection(usersCollectionName)
      .create(blockedStandardUserPayload);
    await blockedStandardPb
      .collection(usersCollectionName)
      .authWithPassword(blockedStandardUserPayload.email, blockedStandardUserPayload.password);
    const blockedStandardGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: blockedStandardUserRecord.id,
        role: "standard",
        status: "blocked",
      });
    await superadminPb
      .collection(globalUserPermissionsCollectionName)
      .create(blockedStandardGlobalUserPermissionsPayload);

    const blogPostPayload = blogPostPayloadBuilder.forCreateRandomData();
    const testFn = (p: { pb: PocketBase }) =>
      p.pb.collection(blogPostsCollectionName).create(blogPostPayload);

    await expect(testFn({ pb: approvedStandardPb })).rejects.toThrow();
    await expect(testFn({ pb: pendingStandardPb })).rejects.toThrow();
    await expect(testFn({ pb: blockedStandardPb })).rejects.toThrow();
    await expect(testFn({ pb: superadminPb })).resolves.toMatchObject(blogPostPayload);
  });
});
