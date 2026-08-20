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
import {
  blogPostImagePayloadBuilder,
  blogPostImagesCollectionName,
} from "@repo/pokkit-db-blog-ts-helpers";

const testMetadata = pokkitDbBlogTestsMetadata.pokkitDbBlogPostImagesCollectionList;
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

  it("PDB-BPI-LIST-01 — Global Superadmin (approved) can LIST", async () => {
    const superadminPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminPb.collection(usersCollectionName).create(superadminUserPayload);
    await superadminPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    const blogPostImagePayload = blogPostImagePayloadBuilder.forCreateData({
      imageFile: mockImageFile,
    });
    await superadminPb.collection(blogPostImagesCollectionName).create(blogPostImagePayload);

    const testFn = (p: { pb: PocketBase }) =>
      p.pb.collection(blogPostImagesCollectionName).getFullList();
    await expect(testFn({ pb: superadminPb })).resolves.toHaveLength(1);
  });

  it("PDB-BPI-LIST-02 — Global Superadmin (pending or blocked) cannot LIST", async () => {
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

    const blogPostImagePayload = blogPostImagePayloadBuilder.forCreateData({
      imageFile: mockImageFile,
    });
    await superadminPb.collection(blogPostImagesCollectionName).create(blogPostImagePayload);

    const testFn = async (p: { pb: PocketBase }) =>
      p.pb.collection(blogPostImagesCollectionName).getFullList();
    await expect(testFn({ pb: pendingSuperadminPb })).resolves.toHaveLength(0);
    await expect(testFn({ pb: blockedSuperadminPb })).resolves.toHaveLength(0);
    await expect(testFn({ pb: superadminPb })).resolves.toHaveLength(1);
  });

  it("PDB-BPI-LIST-03 — Global Admin (approved) can LIST", async () => {
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

    const blogPostImagePayload = blogPostImagePayloadBuilder.forCreateData({
      imageFile: mockImageFile,
    });
    await superadminPb.collection(blogPostImagesCollectionName).create(blogPostImagePayload);

    const testFn = async (p: { pb: PocketBase }) =>
      p.pb.collection(blogPostImagesCollectionName).getFullList();
    await expect(testFn({ pb: approvedAdminPb })).resolves.toHaveLength(1);
    await expect(testFn({ pb: superadminPb })).resolves.toHaveLength(1);
  });

  it("PDB-BPI-LIST-04 — Global Admin (pending or blocked) cannot LIST", async () => {
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

    const blogPostImagePayload = blogPostImagePayloadBuilder.forCreateData({
      imageFile: mockImageFile,
    });
    await superadminPb.collection(blogPostImagesCollectionName).create(blogPostImagePayload);

    const testFn = async (p: { pb: PocketBase }) =>
      p.pb.collection(blogPostImagesCollectionName).getFullList();
    await expect(testFn({ pb: pendingAdminPb })).resolves.toHaveLength(0);
    await expect(testFn({ pb: blockedAdminPb })).resolves.toHaveLength(0);
    await expect(testFn({ pb: superadminPb })).resolves.toHaveLength(1);
  });

  it("PDB-BPI-LIST-05 — Global Standard (approved) can LIST", async () => {
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

    const blogPostImagePayload = blogPostImagePayloadBuilder.forCreateData({
      imageFile: mockImageFile,
    });
    await superadminPb.collection(blogPostImagesCollectionName).create(blogPostImagePayload);

    const testFn = (p: { pb: PocketBase }) =>
      p.pb.collection(blogPostImagesCollectionName).getFullList();

    await expect(testFn({ pb: approvedStandardPb })).resolves.toHaveLength(1);
    await expect(testFn({ pb: superadminPb })).resolves.toHaveLength(1);
    await expect(testFn({ pb: superadminPb })).resolves.toHaveLength(1);
  });

  it("PDB-BPI-LIST-06 — Global Standard (pending or blocked) cannot LIST", async () => {
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

    const blogPostImagePayload = blogPostImagePayloadBuilder.forCreateData({
      imageFile: mockImageFile,
    });
    await superadminPb.collection(blogPostImagesCollectionName).create(blogPostImagePayload);

    const testFn = (p: { pb: PocketBase }) =>
      p.pb.collection(blogPostImagesCollectionName).getFullList();
    await expect(testFn({ pb: pendingStandardPb })).resolves.toHaveLength(0);
    await expect(testFn({ pb: blockedStandardPb })).resolves.toHaveLength(0);
    await expect(testFn({ pb: superadminPb })).resolves.toHaveLength(1);
  });
});
