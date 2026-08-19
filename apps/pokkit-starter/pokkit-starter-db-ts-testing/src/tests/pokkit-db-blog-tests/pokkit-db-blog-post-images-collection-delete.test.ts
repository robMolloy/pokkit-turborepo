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
import { userPayloadBuilder, usersCollectionName } from "@repo/pokkit-db-permissions-ts-helpers";
import { blogPostPayloadBuilder, blogPostsCollectionName } from "@repo/pokkit-db-blog-ts-helpers";

const testMetadata = pokkitDbBlogTestsMetadata.pokkitDbBlogPostImagesCollectionDelete;
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

  it("PDB-BPI-DELETE-01 — Global Superadmin (approved) can DELETE", async () => {
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
    await expect(
      superadminPb.collection(blogPostsCollectionName).delete(blogPostRecord.id),
    ).resolves.toBe(true);
  });

  it("PDB-BPI-DELETE-02 — Global Superadmin (pending or blocked) cannot DELETE", async () => {});

  it("PDB-BPI-DELETE-03 — Global Admin (approved) can DELETE", async () => {});

  it("PDB-BPI-DELETE-04 — Global Admin (pending or blocked) cannot DELETE", async () => {});

  it("PDB-BPI-DELETE-05 — Global Standard (approved, pending or blocked) cannot DELETE", async () => {});
});
