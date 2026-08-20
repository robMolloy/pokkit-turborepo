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

const testMetadata = pokkitDbBlogTestsMetadata.pokkitDbBlogPostImagesCollectionView;
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

  // const blogPostImageRecord = await superadminPb
  //   .collection(blogPostImagesCollectionName)
  //   .create(blogPostImagePayload);

  // const imageUrl = superadminPb.files.getURL(blogPostImageRecord, blogPostImageRecord.imageUrl);
  // const fetchedImageBuffer = await fetchFileBuffer(imageUrl);
  // expect(fetchedImageBuffer).toEqual(mockImageBuffer);

  // const blogPostImageRecordWithImageUrl = { ...blogPostImageRecord, imageUrl };
  // expect(blogPostImageRecordWithImageUrl).toMatchObject({ ...blogPostImagePayload, imageUrl });

  it("PDB-BPI-VIEW-01 — Global Superadmin (approved) can VIEW", async () => {});

  it("PDB-BPI-VIEW-02 — Global Superadmin (pending or blocked) cannot VIEW", async () => {});

  it("PDB-BPI-VIEW-03 — Global Admin (approved) can VIEW", async () => {});

  it("PDB-BPI-VIEW-04 — Global Admin (pending or blocked) cannot VIEW", async () => {});

  it("PDB-BPI-VIEW-05 — Global Standard (approved) can VIEW", async () => {});

  it("PDB-BPI-VIEW-06 — Global Standard (pending or blocked) cannot VIEW", async () => {});
});
