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

const testMetadata = pokkitDbPermissionsTestsMetadata.usersCollectionCreateAction;
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
  });

  beforeEach(async () => {
    await truncatePbCollections({
      pbPortNumber,
      superuserEmail,
      superuserPassword,
      ignoreCollections: [superusersCollectionName],
    });
  });

  it.todo("is connection healthy", async () => {
    const pb = createPbConnection();
    const isHealthy = await pb.health.check();
    expect(isHealthy.code).toBe(200);
  });

  it("PDBP-USERS-SETUP-01 — Verify collection presence and validity is setup correctly", async () => {});

  it.todo("PDBP-USERS-CREATE-01 — Global Superadmin can CREATE", async () => {});

  it.todo("PDBP-USERS-CREATE-02 — Global Admin cannot CREATE", async () => {});

  it.todo("PDBP-USERS-CREATE-03 — Global Standard cannot CREATE", async () => {});

  it.todo("PDBP-USERS-CREATE-OWN-01 — Global Superadmin cannot CREATE OWN", async () => {});

  it.todo("PDBP-USERS-CREATE-OWN-02 — Global Admin cannot CREATE OWN", async () => {});

  it.todo("PDBP-USERS-CREATE-OWN-03 — Global Standard cannot CREATE OWN", async () => {});

  it.todo("PDBP-USERS-VIEW-01 — Global Superadmin can VIEW", async () => {});

  it.todo("PDBP-USERS-VIEW-02 — Global Admin (approved) can VIEW", async () => {});

  it.todo("PDBP-USERS-VIEW-03 — Global Admin (pending or blocked) cannot VIEW", async () => {});

  it.todo("PDBP-USERS-VIEW-04 — Global Standard (approved) can VIEW", async () => {});

  it.todo("PDBP-USERS-VIEW-05 — Global Standard (pending or blocked) cannot VIEW", async () => {});

  it.todo("PDBP-USERS-VIEW-OWN-01 — Global Superadmin can VIEW OWN", async () => {});

  it.todo("PDBP-USERS-VIEW-OWN-02 — Global Admin (approved) can VIEW OWN", async () => {});

  it.todo(
    "PDBP-USERS-VIEW-OWN-03 — Global Admin (pending or blocked) cannot VIEW OWN",
    async () => {},
  );

  it.todo("PDBP-USERS-VIEW-OWN-04 — Global Standard (approved) can VIEW OWN", async () => {});

  it.todo(
    "PDBP-USERS-VIEW-OWN-05 — Global Standard (pending or blocked) cannot VIEW OWN",
    async () => {},
  );

  it.todo("PDBP-USERS-LIST-01 — Global Superadmin can LIST", async () => {});

  it.todo("PDBP-USERS-LIST-02 — Global Admin (approved) can LIST", async () => {});

  it.todo("PDBP-USERS-LIST-03 — Global Admin (pending or blocked) cannot LIST", async () => {});

  it.todo("PDBP-USERS-LIST-04 — Global Standard (approved) can LIST", async () => {});

  it.todo("PDBP-USERS-LIST-05 — Global Standard (pending or blocked) cannot LIST", async () => {});

  it.todo("PDBP-USERS-LIST-OWN-01 — Global Superadmin can LIST OWN", async () => {});

  it.todo("PDBP-USERS-LIST-OWN-02 — Global Admin (approved) can LIST OWN", async () => {});

  it.todo(
    "PDBP-USERS-LIST-OWN-03 — Global Admin (pending or blocked) cannot LIST OWN",
    async () => {},
  );

  it.todo("PDBP-USERS-LIST-OWN-04 — Global Standard (approved) can LIST OWN", async () => {});

  it.todo(
    "PDBP-USERS-LIST-OWN-05 — Global Standard (pending or blocked) cannot LIST OWN",
    async () => {},
  );

  it.todo("PDBP-USERS-UPDATE-01 — Global Superadmin can UPDATE", async () => {});

  it.todo("PDBP-USERS-UPDATE-02 — Global Admin cannot UPDATE", async () => {});

  it.todo("PDBP-USERS-UPDATE-03 — Global Standard cannot UPDATE", async () => {});

  it.todo("PDBP-USERS-UPDATE-OWN-01 — Global Superadmin cannot UPDATE OWN", async () => {});

  it.todo("PDBP-USERS-UPDATE-OWN-02 — Global Admin cannot UPDATE OWN", async () => {});

  it.todo("PDBP-USERS-UPDATE-OWN-03 — Global Standard cannot UPDATE OWN", async () => {});

  it.todo("PDBP-USERS-DELETE-01 — Global Superadmin can DELETE", async () => {});

  it.todo("PDBP-USERS-DELETE-02 — Global Admin cannot DELETE", async () => {});

  it.todo("PDBP-USERS-DELETE-03 — Global Standard cannot DELETE", async () => {});

  it.todo("PDBP-USERS-DELETE-OWN-01 — Global Superadmin cannot DELETE OWN", async () => {});

  it.todo("PDBP-USERS-DELETE-OWN-02 — Global Admin (approved) can DELETE OWN", async () => {});

  it.todo(
    "PDBP-USERS-DELETE-OWN-03 — Global Admin (pending or blocked) cannot DELETE OWN",
    async () => {},
  );

  it.todo("PDBP-USERS-DELETE-OWN-04 — Global Standard (approved) can DELETE OWN", async () => {});

  it.todo(
    "PDBP-USERS-DELETE-OWN-05 — Global Standard (pending or blocked) cannot DELETE OWN",
    async () => {},
  );
});
