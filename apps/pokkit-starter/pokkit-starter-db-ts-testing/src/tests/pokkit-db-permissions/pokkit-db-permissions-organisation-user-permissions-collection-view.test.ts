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
import { pokkitDbPermissionsTestsMetadata } from "./_pokkitDbConfigSyncTestsMetadata";

const testMetadata =
  pokkitDbPermissionsTestsMetadata.pokkitDbPermissionsOrganisationUserPermissionsCollectionView;
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

  it("PDBP-OUP-VIEW-01 — Global Superadmin (approved) can VIEW", async () => {});
  it("PDBP-OUP-VIEW-02 — Global Superadmin (pending or blocked) cannot VIEW", async () => {});
  it("PDBP-OUP-VIEW-03 — Global Admin (approved) can VIEW", async () => {});
  it("PDBP-OUP-VIEW-04 — Global Admin (pending or blocked) cannot VIEW", async () => {});
  it("PDBP-OUP-VIEW-05 — Global Standard (approved) can VIEW", async () => {});
  it("PDBP-OUP-VIEW-06 — Global Standard (pending or blocked) cannot VIEW", async () => {});
  it("PDBP-OUP-VIEW-07 — Organisation Admin (approved) can VIEW", async () => {});
  it("PDBP-OUP-VIEW-08 — Organisation Admin (pending or blocked) cannot VIEW", async () => {});
  it("PDBP-OUP-VIEW-09 — Organisation Standard (approved) can VIEW", async () => {});
  it("PDBP-OUP-VIEW-10 — Organisation Standard (pending or blocked) cannot VIEW", async () => {});

  it("PDBP-OUP-VIEW-OWN-01 — Global Superadmin can VIEW OWN", async () => {});
  it("PDBP-OUP-VIEW-OWN-02 — Global Admin can VIEW OWN", async () => {});
  it("PDBP-OUP-VIEW-OWN-03 — Global Standard can VIEW OWN", async () => {});
  it("PDBP-OUP-VIEW-OWN-04 — Organisation Admin can VIEW OWN", async () => {});
  it("PDBP-OUP-VIEW-OWN-05 — Organisation Standard can VIEW OWN", async () => {});
});
