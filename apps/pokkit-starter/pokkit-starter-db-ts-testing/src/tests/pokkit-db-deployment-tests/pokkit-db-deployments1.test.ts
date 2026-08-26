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
import { pokkitDbDeploymentsTestsMetadata } from "./_pokkitDbDeploymentsTestsMetadata";
import {
  deploymentsCollectionName,
  deploymentsPayloadBuilder,
} from "@repo/pokkit-db-deployments-ts-helpers";

const testMetadata = pokkitDbDeploymentsTestsMetadata.pokkitDbDeployments1;
const testSuiteName = testMetadata.name;

const pbPortNumber = testMetadata.portNumber;
const pbDirPath = `_sandboxes/${testSuiteName}`;
const pbFilePath = getPbFilePath({ pbDirPath });
const pbServeUrl = getPbServeUrl({ pbPortNumber });
const logFilePath = `_logs/${testSuiteName}`;

const mockCollectionsFileBuffer = fse.readFileSync("src/tests/mocks/collections.json");
const mockCollectionsFile = new File([mockCollectionsFileBuffer], "collections.json", {
  type: "application/json",
});
const mockSettingsFileBuffer = fse.readFileSync("src/tests/mocks/settings.json");
const mockSettingsFile = new File([mockSettingsFileBuffer], "settings.json", {
  type: "application/json",
});
const mockSecretsFileBuffer = fse.readFileSync("src/tests/mocks/secrets.json");
const mockSecretsFile = new File([mockSecretsFileBuffer], "secrets.json", {
  type: "application/json",
});
const mockBuildFileBuffer = fse.readFileSync(`${sourceTestBuildDirPath}/app-db`);
// type unix executable file
const mockBuildFile = new File([mockBuildFileBuffer], "app-db", {
  type: "application/x-executable",
});

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
  it("", async () => {
    const superuserPb = createPbConnection();

    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);

    await superuserPb.collection(deploymentsCollectionName).create(
      deploymentsPayloadBuilder.forCreateData({
        buildFile: mockBuildFile,
        settingsFile: mockSettingsFile,
        secretsFile: mockSecretsFile,
        collectionsFile: mockCollectionsFile,
        superuserEmail,
        superuserPassword,
      }),
    );
  });
  it("is connection healthy: AFTER", async () => {
    const pb = createPbConnection();
    const isHealthy = await pb.health.check();
    expect(isHealthy.code).toBe(200);
  });
});
