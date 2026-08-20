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
} from "@repo/pokkit-db-permissions-ts-helpers";
import {
  blogPostImagePayloadBuilder,
  blogPostImagesCollectionName,
} from "@repo/pokkit-db-blog-ts-helpers";

const testMetadata = pokkitDbBlogTestsMetadata.pokkitDbBlogPostImagesCollectionView;
const testSuiteName = testMetadata.name;

const pbPortNumber = testMetadata.portNumber;
const pbDirPath = `_sandboxes/${testSuiteName}`;
const pbFilePath = getPbFilePath({ pbDirPath });
const pbServeUrl = getPbServeUrl({ pbPortNumber });
const logFilePath = `_logs/${testSuiteName}`;

const mockImageBuffer = fse.readFileSync("src/tests/mocks/logo.svg");
const mockImageFile = new File([mockImageBuffer], "logo.svg", { type: "image/svg+xml" });

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

  it("PDB-BPI-VIEW-01 — Global Superadmin (approved) can VIEW", async () => {
    const superadminPb = createPbConnection();
    await createUserAndPermissions({
      user: {
        toBeActionedByPb: superadminPb,
        payload: userPayloadBuilder.forCreateRandomData(),
        shouldAuthenticate: true,
      },
    });

    const blogPostImagePayload = blogPostImagePayloadBuilder.forCreateData({
      imageFile: mockImageFile,
    });
    const blogPostImageRecord = await superadminPb
      .collection(blogPostImagesCollectionName)
      .create(blogPostImagePayload);

    const testFn = (p: { pb: PocketBase }) =>
      p.pb.collection(blogPostImagesCollectionName).getOne(blogPostImageRecord.id);

    await expect(testFn({ pb: superadminPb })).resolves.toMatchObject(blogPostImageRecord);
  });

  it("PDB-BPI-VIEW-02 — Global Superadmin (pending or blocked) cannot VIEW", async () => {
    const superadminPb = createPbConnection();
    await createUserAndPermissions({
      user: {
        toBeActionedByPb: superadminPb,
        payload: userPayloadBuilder.forCreateRandomData(),
        shouldAuthenticate: true,
      },
    });

    const pendingSuperadminPb = createPbConnection();
    await createUserAndPermissions({
      user: {
        toBeActionedByPb: pendingSuperadminPb,
        payload: userPayloadBuilder.forCreateRandomData(),
        shouldAuthenticate: true,
      },
      globalUserPermissions: {
        toBeActionedByPb: superadminPb,
        payload: { status: "pending", role: "superadmin" },
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
        payload: { status: "blocked", role: "superadmin" },
      },
    });

    const blogPostImagePayload = blogPostImagePayloadBuilder.forCreateData({
      imageFile: mockImageFile,
    });
    const blogPostImageRecord = await superadminPb
      .collection(blogPostImagesCollectionName)
      .create(blogPostImagePayload);

    const testFn = (p: { pb: PocketBase }) =>
      p.pb.collection(blogPostImagesCollectionName).getOne(blogPostImageRecord.id);

    await expect(testFn({ pb: pendingSuperadminPb })).rejects.toThrow();
    await expect(testFn({ pb: blockedSuperadminPb })).rejects.toThrow();
    await expect(testFn({ pb: superadminPb })).resolves.toMatchObject(blogPostImageRecord);
  });

  it("PDB-BPI-VIEW-03 — Global Admin (approved) can VIEW", async () => {
    const superadminPb = createPbConnection();
    await createUserAndPermissions({
      user: {
        toBeActionedByPb: superadminPb,
        payload: userPayloadBuilder.forCreateRandomData(),
        shouldAuthenticate: true,
      },
    });
    const approvedAdminPb = createPbConnection();
    await createUserAndPermissions({
      user: {
        toBeActionedByPb: approvedAdminPb,
        payload: userPayloadBuilder.forCreateRandomData(),
        shouldAuthenticate: true,
      },
      globalUserPermissions: {
        toBeActionedByPb: superadminPb,
        payload: { status: "approved", role: "admin" },
      },
    });

    const blogPostImagePayload = blogPostImagePayloadBuilder.forCreateData({
      imageFile: mockImageFile,
    });
    const blogPostImageRecord = await superadminPb
      .collection(blogPostImagesCollectionName)
      .create(blogPostImagePayload);

    const testFn = (p: { pb: PocketBase }) =>
      p.pb.collection(blogPostImagesCollectionName).getOne(blogPostImageRecord.id);

    await expect(testFn({ pb: approvedAdminPb })).resolves.toMatchObject(blogPostImageRecord);
    await expect(testFn({ pb: superadminPb })).resolves.toMatchObject(blogPostImageRecord);
  });

  it("PDB-BPI-VIEW-04 — Global Admin (pending or blocked) cannot VIEW", async () => {
    const superadminPb = createPbConnection();
    await createUserAndPermissions({
      user: {
        toBeActionedByPb: superadminPb,
        payload: userPayloadBuilder.forCreateRandomData(),
        shouldAuthenticate: true,
      },
    });

    const pendingAdminPb = createPbConnection();
    await createUserAndPermissions({
      user: {
        toBeActionedByPb: pendingAdminPb,
        payload: userPayloadBuilder.forCreateRandomData(),
        shouldAuthenticate: true,
      },
      globalUserPermissions: {
        toBeActionedByPb: superadminPb,
        payload: { status: "pending", role: "admin" },
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
        payload: { status: "blocked", role: "admin" },
      },
    });

    const blogPostImagePayload = blogPostImagePayloadBuilder.forCreateData({
      imageFile: mockImageFile,
    });
    const blogPostImageRecord = await superadminPb
      .collection(blogPostImagesCollectionName)
      .create(blogPostImagePayload);

    const testFn = (p: { pb: PocketBase }) =>
      p.pb.collection(blogPostImagesCollectionName).getOne(blogPostImageRecord.id);
    await expect(testFn({ pb: pendingAdminPb })).rejects.toThrow();
    await expect(testFn({ pb: blockedAdminPb })).rejects.toThrow();
    await expect(testFn({ pb: superadminPb })).resolves.toMatchObject(blogPostImageRecord);
  });

  it("PDB-BPI-VIEW-05 — Global Standard (approved) can VIEW", async () => {
    const superadminPb = createPbConnection();
    await createUserAndPermissions({
      user: {
        toBeActionedByPb: superadminPb,
        payload: userPayloadBuilder.forCreateRandomData(),
        shouldAuthenticate: true,
      },
    });

    const approvedStandardPb = createPbConnection();
    await createUserAndPermissions({
      user: {
        toBeActionedByPb: approvedStandardPb,
        payload: userPayloadBuilder.forCreateRandomData(),
        shouldAuthenticate: true,
      },
      globalUserPermissions: {
        toBeActionedByPb: superadminPb,
        payload: { status: "approved", role: "standard" },
      },
    });

    const blogPostImagePayload = blogPostImagePayloadBuilder.forCreateData({
      imageFile: mockImageFile,
    });
    const blogPostImageRecord = await superadminPb
      .collection(blogPostImagesCollectionName)
      .create(blogPostImagePayload);

    const testFn = (p: { pb: PocketBase }) =>
      p.pb.collection(blogPostImagesCollectionName).getOne(blogPostImageRecord.id);
    await expect(testFn({ pb: approvedStandardPb })).resolves.toMatchObject(blogPostImageRecord);
    await expect(testFn({ pb: superadminPb })).resolves.toMatchObject(blogPostImageRecord);
  });

  it("PDB-BPI-VIEW-06 — Global Standard (pending or blocked) cannot VIEW", async () => {
    const superadminPb = createPbConnection();
    await createUserAndPermissions({
      user: {
        toBeActionedByPb: superadminPb,
        payload: userPayloadBuilder.forCreateRandomData(),
        shouldAuthenticate: true,
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
        payload: { status: "pending", role: "standard" },
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
        payload: { status: "blocked", role: "standard" },
      },
    });

    const blogPostImagePayload = blogPostImagePayloadBuilder.forCreateData({
      imageFile: mockImageFile,
    });
    const blogPostImageRecord = await superadminPb
      .collection(blogPostImagesCollectionName)
      .create(blogPostImagePayload);

    const testFn = (p: { pb: PocketBase }) =>
      p.pb.collection(blogPostImagesCollectionName).getOne(blogPostImageRecord.id);
    await expect(testFn({ pb: pendingStandardPb })).rejects.toThrow();
    await expect(testFn({ pb: blockedStandardPb })).rejects.toThrow();
    await expect(testFn({ pb: superadminPb })).resolves.toMatchObject(blogPostImageRecord);
  });
});
