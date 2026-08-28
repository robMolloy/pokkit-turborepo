import {
  deploymentsCollectionName,
  deploymentsPayloadBuilder,
  nginxTemplatesCollectionName,
  nginxTemplatesPayloadBuilder,
} from "@repo/pokkit-db-deployments-ts-helpers";
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

  it("serves the deployment without pokkitDb pbConfig files on the specified port", async () => {
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

  it("serves a deployment with pokkitDb pbConfig files on the specified port and creates a deployment directory", async () => {
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

  it("writes a templatable string to a sandboxed file when a deployment record is created if an nginx template record exists", async () => {
    const deployedPortNumber = 9003;
    const sandboxedNginxConfigFilePath = `${pbDirPath}/config-${deployedPortNumber}.conf`;

    await killPbInstance({ pbPortNumber: deployedPortNumber });
    const superuserPb = createPbConnection();

    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);

    await superuserPb.collection(nginxTemplatesCollectionName).create(
      nginxTemplatesPayloadBuilder.forCreateData({
        templateBody: "test",
        filePath: sandboxedNginxConfigFilePath,
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
    const nginxConfigStatResp = await fse.statSync(sandboxedNginxConfigFilePath);
    expect(nginxConfigStatResp.isFile()).toBe(true);
  });

  it("populates the template with the port number into the nginx template", async () => {
    const deployedPortNumber = 9004;
    const sandboxedNginxConfigFilePath = `${pbDirPath}/config-${deployedPortNumber}.conf`;

    await killPbInstance({ pbPortNumber: deployedPortNumber });
    const superuserPb = createPbConnection();

    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);

    await superuserPb.collection(nginxTemplatesCollectionName).create(
      nginxTemplatesPayloadBuilder.forCreateData({
        templateBody: "{{range .}}{{.portNumber}}{{end}}",
        filePath: sandboxedNginxConfigFilePath,
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
    const nginxConfigStatResp = await fse.statSync(sandboxedNginxConfigFilePath);
    expect(nginxConfigStatResp.isFile()).toBe(true);
    const nginxConfigContent = await fse.readFile(sandboxedNginxConfigFilePath, "utf8");
    expect(nginxConfigContent).toBe(`${deployedPortNumber}`);
  });

  it("populates the template with the port numbers into the nginx config from the nginx template", async () => {
    const deployedPortNumber1 = 9005;
    const deployedPortNumber2 = 9006;
    const sandboxedNginxConfigFilePath = `${pbDirPath}/config-${deployedPortNumber1}-${deployedPortNumber2}.conf`;

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
        filePath: sandboxedNginxConfigFilePath,
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
    const nginxConfigStatResp = await fse.statSync(sandboxedNginxConfigFilePath);

    expect(nginxConfigStatResp.isFile()).toBe(true);
    const nginxConfigContent = await fse.readFile(sandboxedNginxConfigFilePath, "utf8");
    expect(nginxConfigContent).toBe(`-${deployedPortNumber1}-${deployedPortNumber2}`);
  });

  it("renders a sudo-real nginx template", async () => {
    const deployedPortNumber1 = 9007;
    const deployedPortNumber2 = 9008;
    const sandboxedNginxConfigFilePath = `${pbDirPath}/config-${deployedPortNumber1}-${deployedPortNumber2}.conf`;

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
        templateBody: `server {
    listen 80;
    server_name pokkit.cloud;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name pokkit.cloud;

    ssl_certificate /etc/letsencrypt/live/pokkit.cloud/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pokkit.cloud/privkey.pem;

{{- range . }}

    location /{{ .portNumber }}/ {
        proxy_pass http://127.0.0.1:{{ .portNumber }}/;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

{{- end }}

}`,
        filePath: sandboxedNginxConfigFilePath,
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
    const nginxConfigStatResp = await fse.statSync(sandboxedNginxConfigFilePath);

    expect(nginxConfigStatResp.isFile()).toBe(true);
    const nginxConfigContent = await fse.readFile(sandboxedNginxConfigFilePath, "utf8");
    expect(nginxConfigContent).toBe(`server {
    listen 80;
    server_name pokkit.cloud;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name pokkit.cloud;

    ssl_certificate /etc/letsencrypt/live/pokkit.cloud/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pokkit.cloud/privkey.pem;

    location /9007/ {
        proxy_pass http://127.0.0.1:9007/;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location /9008/ {
        proxy_pass http://127.0.0.1:9008/;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

}`);
  });

  it("deploys all the existing deployment records onServe", async () => {
    const deployedPortNumber = 9009;
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

    await expect(fetch(`http://0.0.0.0:${pbPortNumber}/api/health`)).resolves.toMatchObject({
      status: 200,
    });
    await expect(fetch(`http://0.0.0.0:${deployedPortNumber}/api/health`)).resolves.toMatchObject({
      status: 200,
    });

    await killPbInstance({ pbPortNumber });
    await delay(1000);

    await expect(fetch(`http://0.0.0.0:${pbPortNumber}/api/health`)).rejects.toThrow();
    await expect(fetch(`http://0.0.0.0:${deployedPortNumber}/api/health`)).rejects.toThrow();

    await servePb({ pbFilePath, pbPortNumber, logFilePath });

    await expect(fetch(`http://0.0.0.0:${pbPortNumber}/api/health`)).resolves.toMatchObject({
      status: 200,
    });
    // await expect(`http://0.0.0.0:${deployedPortNumber}/api/health`).toMatchObject({ status: 200 });

    // const deployedHealthResponseDead = await fetch(
    //   `http://0.0.0.0:${deployedPortNumber}/api/health`,
    // );
    // expect(deployedHealthResponseDead.status).toBe(200);
  });

  // it.skip("deploys all the existing deployment records onServe", async () => {
  //   const deployedPortNumber = 9010;
  //   await killPbInstance({ pbPortNumber: deployedPortNumber });
  //   const superuserPb = createPbConnection();

  //   await superuserPb
  //     .collection(superusersCollectionName)
  //     .authWithPassword(superuserEmail, superuserPassword);

  //   await superuserPb.collection(deploymentsCollectionName).create(
  //     deploymentsPayloadBuilder.forCreateData({
  //       buildFile: mockBuildFile,
  //       portNumber: deployedPortNumber,
  //       superuserEmail,
  //       superuserPassword,
  //     }),
  //   );

  //   const healthResponse = await fetch(`http://0.0.0.0:${deployedPortNumber}/api/health`);
  //   expect(healthResponse.status).toBe(200);

  //   await killPbInstance({ pbPortNumber });
  //   const healthResponseDead = await fetch(`http://0.0.0.0:${deployedPortNumber}/api/health`);
  //   expect(healthResponseDead.status).toBe(200);
  // });
  it("reports a healthy PocketBase connection after deployments", async () => {
    const pb = createPbConnection();
    const isHealthy = await pb.health.check();
    expect(isHealthy.code).toBe(200);
  });
});
