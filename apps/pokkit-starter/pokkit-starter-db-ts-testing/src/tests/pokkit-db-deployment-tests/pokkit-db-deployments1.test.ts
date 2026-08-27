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
  nginxTemplatesCollectionName,
  nginxTemplatesPayloadBuilder,
} from "@repo/pokkit-db-deployments-ts-helpers";
import { delay } from "@repo/pokkit-utils";

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
    await killPbInstance({ pbPortNumber });
    await delay(3000);
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

  it("adding a deployment record without a port number should serve the deployment on port 9001 (without pbconfigFiles)", async () => {
    const deployedPortNumber = 9001;
    await killPbInstance({ pbPortNumber: deployedPortNumber });
    const superuserPb = createPbConnection();

    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);

    await superuserPb.collection(deploymentsCollectionName).create(
      deploymentsPayloadBuilder.forCreateData({
        buildFile: mockBuildFile,
        portNumber: deployedPortNumber,
        superuserEmail,
        superuserPassword,
      }),
    );

    const healthResponse = await fetch(`http://0.0.0.0:${deployedPortNumber}/api/health`);
    expect(healthResponse.status).toBe(200);
  });

  it.skip("adding a deployment record without a port number should serve the deployment on port 9002 (with pbconfigFiles)", async () => {
    const deployedPortNumber = 9002;
    await killPbInstance({ pbPortNumber: deployedPortNumber });
    const superuserPb = createPbConnection();

    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);

    const deploymentRecord = await superuserPb.collection(deploymentsCollectionName).create(
      deploymentsPayloadBuilder.forCreateData({
        buildFile: mockBuildFile,
        settingsFile: mockSettingsFile,
        secretsFile: mockSecretsFile,
        collectionsFile: mockCollectionsFile,
        portNumber: deployedPortNumber,
        superuserEmail,
        superuserPassword,
      }),
    );

    const healthResponse = await fetch(`http://0.0.0.0:${deployedPortNumber}/api/health`);
    expect(healthResponse.status).toBe(200);

    const statResp = await fse.statSync(`${pbDirPath}/_deployments/${deploymentRecord.id}`);
    expect(statResp.isDirectory()).toBe(true);
  });

  it.skip("creates a nginx config file for the deployment if there is a record in the nginxTemplates collection", async () => {
    const deployedPortNumber = 9003;
    const nginxConfigFilePath = `${pbDirPath}/config-${deployedPortNumber}.conf`;

    await killPbInstance({ pbPortNumber: deployedPortNumber });
    const superuserPb = createPbConnection();

    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);

    await superuserPb.collection(nginxTemplatesCollectionName).create(
      nginxTemplatesPayloadBuilder.forCreateData({
        templateBody: "test",
        filePath: nginxConfigFilePath,
      }),
    );

    const deploymentRecord = await superuserPb.collection(deploymentsCollectionName).create(
      deploymentsPayloadBuilder.forCreateData({
        buildFile: mockBuildFile,
        settingsFile: mockSettingsFile,
        secretsFile: mockSecretsFile,
        collectionsFile: mockCollectionsFile,
        portNumber: deployedPortNumber,
        superuserEmail,
        superuserPassword,
      }),
    );

    const healthResponse = await fetch(`http://0.0.0.0:${deployedPortNumber}/api/health`);
    expect(healthResponse.status).toBe(200);

    const deploymentStatResp = await fse.statSync(
      `${pbDirPath}/_deployments/${deploymentRecord.id}`,
    );
    expect(deploymentStatResp.isDirectory()).toBe(true);
    const nginxConfigStatResp = await fse.statSync(nginxConfigFilePath);
    expect(nginxConfigStatResp.isFile()).toBe(true);
  });

  it.skip("checks the templating of the nginx config file for the deployment if there is a record in the nginxTemplates collection", async () => {
    const deployedPortNumber = 9004;
    const nginxConfigFilePath = `${pbDirPath}/config-${deployedPortNumber}.conf`;

    await killPbInstance({ pbPortNumber: deployedPortNumber });
    const superuserPb = createPbConnection();

    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);

    await superuserPb.collection(nginxTemplatesCollectionName).create(
      nginxTemplatesPayloadBuilder.forCreateData({
        templateBody: "{{range .}}{{.portNumber}}{{end}}",
        filePath: nginxConfigFilePath,
      }),
    );

    const deploymentRecord = await superuserPb.collection(deploymentsCollectionName).create(
      deploymentsPayloadBuilder.forCreateData({
        buildFile: mockBuildFile,
        settingsFile: mockSettingsFile,
        secretsFile: mockSecretsFile,
        collectionsFile: mockCollectionsFile,
        portNumber: deployedPortNumber,
        superuserEmail,
        superuserPassword,
      }),
    );

    const healthResponse = await fetch(`http://0.0.0.0:${deployedPortNumber}/api/health`);
    expect(healthResponse.status).toBe(200);

    const deploymentStatResp = await fse.statSync(
      `${pbDirPath}/_deployments/${deploymentRecord.id}`,
    );
    expect(deploymentStatResp.isDirectory()).toBe(true);
    const nginxConfigStatResp = await fse.statSync(nginxConfigFilePath);
    expect(nginxConfigStatResp.isFile()).toBe(true);
    const nginxConfigContent = await fse.readFile(nginxConfigFilePath, "utf8");
    expect(nginxConfigContent).toBe(`${deployedPortNumber}`);
  });

  it.skip("checks the templating of the nginx config file for the deployment if there is a record in the nginxTemplates collection", async () => {
    const deployedPortNumber1 = 9005;
    const deployedPortNumber2 = 9006;
    const nginxConfigFilePath = `${pbDirPath}/config-${deployedPortNumber1}-${deployedPortNumber2}.conf`;

    await killPbInstance({ pbPortNumber: deployedPortNumber1 });
    await killPbInstance({ pbPortNumber: deployedPortNumber2 });
    const superuserPb = createPbConnection();

    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);

    const deploymentRecord1 = await superuserPb.collection(deploymentsCollectionName).create(
      deploymentsPayloadBuilder.forCreateData({
        buildFile: mockBuildFile,
        settingsFile: mockSettingsFile,
        secretsFile: mockSecretsFile,
        collectionsFile: mockCollectionsFile,
        portNumber: deployedPortNumber1,
        superuserEmail,
        superuserPassword,
      }),
    );

    const healthResponse1 = await fetch(`http://0.0.0.0:${deployedPortNumber1}/api/health`);
    expect(healthResponse1.status).toBe(200);

    const deployment1DirPath = `${pbDirPath}/_deployments/${deploymentRecord1.id}`;
    const deployment1DirStatResp = await fse.statSync(deployment1DirPath);
    expect(deployment1DirStatResp.isDirectory()).toBe(true);

    await superuserPb.collection(nginxTemplatesCollectionName).create(
      nginxTemplatesPayloadBuilder.forCreateData({
        templateBody: "{{range .}}-{{.portNumber}}{{end}}",
        filePath: nginxConfigFilePath,
      }),
    );

    const deploymentRecord2 = await superuserPb.collection(deploymentsCollectionName).create(
      deploymentsPayloadBuilder.forCreateData({
        buildFile: mockBuildFile,
        settingsFile: mockSettingsFile,
        secretsFile: mockSecretsFile,
        collectionsFile: mockCollectionsFile,
        portNumber: deployedPortNumber2,
        superuserEmail,
        superuserPassword,
      }),
    );

    const healthResponse2 = await fetch(`http://0.0.0.0:${deployedPortNumber2}/api/health`);
    expect(healthResponse2.status).toBe(200);

    const deployment2DirPath = `${pbDirPath}/_deployments/${deploymentRecord2.id}`;
    const deployment2DirStatResp = await fse.statSync(deployment2DirPath);

    expect(deployment2DirStatResp.isDirectory()).toBe(true);
    const nginxConfigStatResp = await fse.statSync(nginxConfigFilePath);

    expect(nginxConfigStatResp.isFile()).toBe(true);
    const nginxConfigContent = await fse.readFile(nginxConfigFilePath, "utf8");
    expect(nginxConfigContent).toBe(`-${deployedPortNumber1}-${deployedPortNumber2}`);
  });

  it("is connection healthy: AFTER", async () => {
    const pb = createPbConnection();
    const isHealthy = await pb.health.check();
    expect(isHealthy.code).toBe(200);
  });
});
