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
  pokkitDbPermissionsTestsMetadata.pokkitDbPermissionsOrganisationUserPermissionsCollectionDelete;
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

  it("PDBP-OUP-DELETE-01 — Global Superadmin (approved) can DELETE", async () => {});
  it("PDBP-OUP-DELETE-02 — Global Superadmin (pending or blocked) cannot DELETE", async () => {});
  it("PDBP-OUP-DELETE-03 — Global Admin cannot DELETE", async () => {});
  it("PDBP-OUP-DELETE-04 — Global Standard cannot DELETE", async () => {});
  it("PDBP-OUP-DELETE-05 — Organisation Admin (approved) can DELETE", async () => {});
  it("PDBP-OUP-DELETE-06 — Organisation Admin (pending or blocked) cannot DELETE", async () => {});
  it("PDBP-OUP-DELETE-07 — Organisation Standard cannot DELETE", async () => {});

  it("PDBP-OUP-DELETE-OWN-01 — Organisation Admin cannot DELETE OWN", async () => {});
  it("PDBP-OUP-DELETE-OWN-02 — Organisation Standard cannot DELETE OWN", async () => {});
});
