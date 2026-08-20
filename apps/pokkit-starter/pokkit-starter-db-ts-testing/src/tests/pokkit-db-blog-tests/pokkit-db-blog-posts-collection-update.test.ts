import { blogPostPayloadBuilder, blogPostsCollectionName } from "@repo/pokkit-db-blog-ts-helpers";
import {
  createUserAndPermissions,
  userPayloadBuilder,
  usersCollectionName,
} from "@repo/pokkit-db-permissions-ts-helpers";
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

const testMetadata = pokkitDbBlogTestsMetadata.pokkitDbBlogPostsCollectionUpdate;
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

  it("PDB-BP-UPDATE-01 — Global Superadmin (approved) can UPDATE", async () => {
    const superadminPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminPb.collection(usersCollectionName).create(superadminUserPayload);
    await superadminPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    const blogPostPayload = blogPostPayloadBuilder.forCreateRandomData();
    const blogPostRecord = await superadminPb
      .collection(blogPostsCollectionName)
      .create(blogPostPayload);
    const updatedBlogPostPayload = blogPostPayloadBuilder.forCreateData({
      ...blogPostPayload,
      title: "Updated Title",
    });

    await expect(
      superadminPb
        .collection(blogPostsCollectionName)
        .update(blogPostRecord.id, updatedBlogPostPayload),
    ).resolves.toMatchObject(updatedBlogPostPayload);
  });

  it("PDB-BP-UPDATE-02 — Global Superadmin (pending or blocked) cannot UPDATE", async () => {
    const superadminPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminPb.collection(usersCollectionName).create(superadminUserPayload);
    await superadminPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    const pendingSuperadminPb = createPbConnection();
    await createUserAndPermissions({
      user: {
        toBeActionedByPb: pendingSuperadminPb,
        payload: userPayloadBuilder.forCreateRandomData(),
        shouldAuthenticate: true,
      },
      globalUserPermissions: {
        toBeActionedByPb: superadminPb,
        payload: { role: "superadmin", status: "pending" },
      },
    });

    const blockedSuperadminPb = createPbConnection();
    await createUserAndPermissions({
      user: {
        toBeActionedByPb: blockedSuperadminPb,
        payload: userPayloadBuilder.forCreateRandomData(),
        shouldAuthenticate: true,
      },
      globalUserPermissions: {
        toBeActionedByPb: superadminPb,
        payload: { role: "superadmin", status: "blocked" },
      },
    });

    const blogPostPayload = blogPostPayloadBuilder.forCreateRandomData();
    const blogPostRecord = await superadminPb
      .collection(blogPostsCollectionName)
      .create(blogPostPayload);
    const updatedBlogPostPayload = blogPostPayloadBuilder.forCreateData({
      ...blogPostPayload,
      title: "Updated Title",
    });

    const testFn = (p: { pb: PocketBase }) =>
      p.pb.collection(blogPostsCollectionName).update(blogPostRecord.id, updatedBlogPostPayload);
    await expect(testFn({ pb: pendingSuperadminPb })).rejects.toThrow();
    await expect(testFn({ pb: blockedSuperadminPb })).rejects.toThrow();
    await expect(testFn({ pb: superadminPb })).resolves.toMatchObject(updatedBlogPostPayload);
  });

  it("PDB-BP-UPDATE-03 — Global Admin (approved) can UPDATE", async () => {
    const superadminPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminPb.collection(usersCollectionName).create(superadminUserPayload);
    await superadminPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    const approvedAdminPb = createPbConnection();
    await createUserAndPermissions({
      user: {
        toBeActionedByPb: approvedAdminPb,
        payload: userPayloadBuilder.forCreateRandomData(),
        shouldAuthenticate: true,
      },
      globalUserPermissions: {
        toBeActionedByPb: superadminPb,
        payload: { role: "admin", status: "approved" },
      },
    });

    const blogPostPayload = blogPostPayloadBuilder.forCreateRandomData();
    const blogPostRecord = await superadminPb
      .collection(blogPostsCollectionName)
      .create(blogPostPayload);
    const updatedBlogPostPayload = blogPostPayloadBuilder.forCreateData({
      ...blogPostPayload,
      title: "Updated Title",
    });

    await expect(
      approvedAdminPb
        .collection(blogPostsCollectionName)
        .update(blogPostRecord.id, updatedBlogPostPayload),
    ).resolves.toMatchObject(updatedBlogPostPayload);
  });

  it("PDB-BP-UPDATE-04 — Global Admin (pending or blocked) cannot UPDATE", async () => {
    const superadminPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminPb.collection(usersCollectionName).create(superadminUserPayload);
    await superadminPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    const pendingAdminPb = createPbConnection();
    await createUserAndPermissions({
      user: {
        toBeActionedByPb: pendingAdminPb,
        payload: userPayloadBuilder.forCreateRandomData(),
        shouldAuthenticate: true,
      },
      globalUserPermissions: {
        toBeActionedByPb: superadminPb,
        payload: { role: "admin", status: "pending" },
      },
    });

    const blockedadminPb = createPbConnection();
    await createUserAndPermissions({
      user: {
        toBeActionedByPb: blockedadminPb,
        payload: userPayloadBuilder.forCreateRandomData(),
        shouldAuthenticate: true,
      },
      globalUserPermissions: {
        toBeActionedByPb: superadminPb,
        payload: { role: "admin", status: "blocked" },
      },
    });

    const blogPostPayload = blogPostPayloadBuilder.forCreateRandomData();
    const blogPostRecord = await superadminPb
      .collection(blogPostsCollectionName)
      .create(blogPostPayload);
    const updatedBlogPostPayload = blogPostPayloadBuilder.forCreateData({
      ...blogPostPayload,
      title: "Updated Title",
    });

    const testFn = (p: { pb: PocketBase }) =>
      p.pb.collection(blogPostsCollectionName).update(blogPostRecord.id, updatedBlogPostPayload);
    await expect(testFn({ pb: pendingAdminPb })).rejects.toThrow();
    await expect(testFn({ pb: blockedadminPb })).rejects.toThrow();
    await expect(testFn({ pb: superadminPb })).resolves.toMatchObject(updatedBlogPostPayload);
  });

  it("PDB-BP-UPDATE-05 — Global Standard (approved, pending or blocked) cannot UPDATE", async () => {
    const superadminPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminPb.collection(usersCollectionName).create(superadminUserPayload);
    await superadminPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    const approvedStandardPb = createPbConnection();
    await createUserAndPermissions({
      user: {
        toBeActionedByPb: approvedStandardPb,
        payload: userPayloadBuilder.forCreateRandomData(),
        shouldAuthenticate: true,
      },
      globalUserPermissions: {
        toBeActionedByPb: superadminPb,
        payload: { role: "standard", status: "approved" },
      },
    });

    const pendingStandardPb = createPbConnection();
    await createUserAndPermissions({
      user: {
        toBeActionedByPb: pendingStandardPb,
        payload: userPayloadBuilder.forCreateRandomData(),
        shouldAuthenticate: true,
      },
      globalUserPermissions: {
        toBeActionedByPb: superadminPb,
        payload: { role: "standard", status: "pending" },
      },
    });

    const blockedStandardPb = createPbConnection();
    await createUserAndPermissions({
      user: {
        toBeActionedByPb: blockedStandardPb,
        payload: userPayloadBuilder.forCreateRandomData(),
        shouldAuthenticate: true,
      },
      globalUserPermissions: {
        toBeActionedByPb: superadminPb,
        payload: { role: "standard", status: "blocked" },
      },
    });

    const blogPostPayload = blogPostPayloadBuilder.forCreateRandomData();
    const blogPostRecord = await superadminPb
      .collection(blogPostsCollectionName)
      .create(blogPostPayload);
    const updatedBlogPostPayload = blogPostPayloadBuilder.forCreateData({
      ...blogPostPayload,
      title: "Updated Title",
    });

    const testFn = (p: { pb: PocketBase }) =>
      p.pb.collection(blogPostsCollectionName).update(blogPostRecord.id, updatedBlogPostPayload);
    await expect(testFn({ pb: approvedStandardPb })).rejects.toThrow();
    await expect(testFn({ pb: pendingStandardPb })).rejects.toThrow();
    await expect(testFn({ pb: blockedStandardPb })).rejects.toThrow();
    await expect(testFn({ pb: superadminPb })).resolves.toMatchObject(updatedBlogPostPayload);
  });
});
