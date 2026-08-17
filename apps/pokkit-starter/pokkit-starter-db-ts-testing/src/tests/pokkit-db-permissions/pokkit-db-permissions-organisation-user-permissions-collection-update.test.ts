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
  pokkitDbPermissionsTestsMetadata.pokkitDbPermissionsOrganisationUserPermissionsCollectionUpdate;
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

  it("PDBP-OUP-UPDATE-01 — Global Superadmin (approved) can UPDATE", async () => {});
  it("PDBP-OUP-UPDATE-02 — Global Superadmin (pending or blocked) cannot UPDATE", async () => {});
  it("PDBP-OUP-UPDATE-03 — Global Admin cannot UPDATE", async () => {});
  it("PDBP-OUP-UPDATE-04 — Global Standard cannot UPDATE", async () => {});
  it("PDBP-OUP-UPDATE-05 — Organisation Admin (approved) can UPDATE", async () => {});
  it("PDBP-OUP-UPDATE-06 — Organisation Admin (pending or blocked) cannot UPDATE", async () => {});
  it("PDBP-OUP-UPDATE-07 — Organisation Standard cannot UPDATE", async () => {});

  it("PDBP-OUP-UPDATE-OWN-01 — Organisation Admin cannot UPDATE OWN", async () => {});
  it("PDBP-OUP-UPDATE-OWN-02 — Organisation Standard cannot UPDATE OWN", async () => {});
});
