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
  createUserAndPermissions,
  userPayloadBuilder,
  usersCollectionName,
} from "@repo/pokkit-db-permissions-ts-helpers";
import { blogPostPayloadBuilder, blogPostsCollectionName } from "@repo/pokkit-db-blog-ts-helpers";
import { formatDateForPb } from "@repo/pokkit-utils";

const testMetadata = pokkitDbBlogTestsMetadata.pokkitDbBlogPostsCollectionView;
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

  it("PDB-BP-VIEW-01 — Global Superadmin (approved) can VIEW", async () => {
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

    const testFn = (p: { pb: PocketBase }) =>
      p.pb.collection(blogPostsCollectionName).getOne(blogPostRecord.id);
    await expect(testFn({ pb: superadminPb })).resolves.toMatchObject(blogPostRecord);
  });

  it("PDB-BP-VIEW-02 — Global Superadmin (pending or blocked) cannot VIEW", async () => {
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

    const testFn = (p: { pb: PocketBase }) =>
      p.pb.collection(blogPostsCollectionName).getOne(blogPostRecord.id);
    await expect(testFn({ pb: pendingSuperadminPb })).rejects.toThrow();
    await expect(testFn({ pb: blockedSuperadminPb })).rejects.toThrow();
    await expect(testFn({ pb: superadminPb })).resolves.toMatchObject(blogPostRecord);
  });

  it("PDB-BP-VIEW-03 — Global Admin (approved) can VIEW", async () => {
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

    const testFn = (p: { pb: PocketBase }) =>
      p.pb.collection(blogPostsCollectionName).getOne(blogPostRecord.id);
    await expect(testFn({ pb: approvedAdminPb })).resolves.toMatchObject(blogPostRecord);
    await expect(testFn({ pb: superadminPb })).resolves.toMatchObject(blogPostRecord);
  });

  it("PDB-BP-VIEW-04 — Global Admin (pending or blocked) cannot VIEW", async () => {
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

    const blockedAdminPb = createPbConnection();
    await createUserAndPermissions({
      user: {
        toBeActionedByPb: blockedAdminPb,
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

    const testFn = (p: { pb: PocketBase }) =>
      p.pb.collection(blogPostsCollectionName).getOne(blogPostRecord.id);
    await expect(testFn({ pb: pendingAdminPb })).rejects.toThrow();
    await expect(testFn({ pb: blockedAdminPb })).rejects.toThrow();
    await expect(testFn({ pb: superadminPb })).resolves.toMatchObject(blogPostRecord);
  });

  it("PDB-BP-VIEW-05 — Global Standard (approved) can VIEW", async () => {
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

    const blogPostPublishNowPayload = blogPostPayloadBuilder.forCreateRandomData({
      publishAt: formatDateForPb(new Date()),
    });
    const blogPostPublishNowRecord = await superadminPb
      .collection(blogPostsCollectionName)
      .create(blogPostPublishNowPayload);

    const testFn = async (p: { pb: PocketBase }) =>
      p.pb.collection(blogPostsCollectionName).getOne(blogPostPublishNowRecord.id);
    await expect(testFn({ pb: approvedStandardPb })).resolves.toMatchObject(
      blogPostPublishNowRecord,
    );
    await expect(testFn({ pb: superadminPb })).resolves.toMatchObject(blogPostPublishNowRecord);
  });

  it("PDB-BP-VIEW-06 — Global Standard (pending or blocked) cannot VIEW", async () => {
    const superadminPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminPb.collection(usersCollectionName).create(superadminUserPayload);
    await superadminPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

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

    const testFn = async (p: { pb: PocketBase }) =>
      p.pb.collection(blogPostsCollectionName).getOne(blogPostRecord.id);
    await expect(testFn({ pb: pendingStandardPb })).rejects.toThrow();
    await expect(testFn({ pb: blockedStandardPb })).rejects.toThrow();
    await expect(testFn({ pb: superadminPb })).resolves.toMatchObject(blogPostRecord);
  });

  it("PDB-BP-VIEW-07 — Global Standard (approved) cannot VIEW if publishAt datetime is in future", async () => {
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

    const blogPostPublishedTomorrowPayload = blogPostPayloadBuilder.forCreateRandomData({
      publishAt: formatDateForPb(new Date(Date.now() + 24 * 60 * 60 * 1000)),
    });
    const blogPostPublishedTomorrowRecord = await superadminPb
      .collection(blogPostsCollectionName)
      .create(blogPostPublishedTomorrowPayload);

    const blogPostPublishBlankPayload = blogPostPayloadBuilder.forCreateRandomData();
    const blogPostPublishBlankRecord = await superadminPb
      .collection(blogPostsCollectionName)
      .create(blogPostPublishBlankPayload);

    const testFn1 = async (p: { pb: PocketBase }) =>
      p.pb.collection(blogPostsCollectionName).getOne(blogPostPublishedTomorrowRecord.id);
    const testFn2 = async (p: { pb: PocketBase }) =>
      p.pb.collection(blogPostsCollectionName).getOne(blogPostPublishBlankRecord.id);

    await expect(testFn1({ pb: approvedStandardPb })).rejects.toThrow();
    await expect(testFn2({ pb: approvedStandardPb })).rejects.toThrow();

    await expect(testFn1({ pb: superadminPb })).resolves.toMatchObject(
      blogPostPublishedTomorrowRecord,
    );
    await expect(testFn2({ pb: superadminPb })).resolves.toMatchObject(blogPostPublishBlankRecord);
  });
});
