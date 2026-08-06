import {
  clearPb,
  getPbFilePath,
  getPbServeUrl,
  getPokkitDbSecretsFilePath,
  killPbInstance,
  pbConfigSecretsCollectionName,
  servePb,
  superusersCollectionName,
  upsertPbAdminCredentialsFromCli,
} from "@repo/pokkit-testing";
import fse from "fs-extra";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PocketBase } from "../../config/pocketbaseConfig";
import { sourceTestBuildDirPath, superuserEmail, superuserPassword } from "../_constants";
import { pokkitDbConfigSyncTestsMetadata } from "./_pokkitDbConfigSyncTestsMetadata";
import { validSecretsFileData } from "./mocks/validSecretsFileData";

const testMetadata = pokkitDbConfigSyncTestsMetadata.secretFileValid;
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
    fse.removeSync(getPokkitDbSecretsFilePath({ pbDirPath }));
    fse.writeFileSync(
      getPokkitDbSecretsFilePath({ pbDirPath }),
      JSON.stringify(validSecretsFileData, null, 2),
    );

    await servePb({ pbFilePath, pbPortNumber, logFilePath });
    await upsertPbAdminCredentialsFromCli({ pbFilePath, superuserEmail, superuserPassword });
  });

  afterAll(async () => {
    killPbInstance({ pbPortNumber });
    fse.removeSync(pbDirPath);
  });

  beforeEach(async () => {
    await clearPb({ pbPortNumber, superuserEmail, superuserPassword });
  });

  it("is connection healthy", async () => {
    const pb = createPbConnection();
    const isHealthy = await pb.health.check();
    expect(isHealthy.code).toBe(200);
  });

  it("PDBCS-SEC-01 — Startup merges `_pb_config_secrets` collection into the database then removes all", async () => {
    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);
    const collections = await superuserPb.collections.getFullList();
    expect(
      collections.some((collection) => collection.name === pbConfigSecretsCollectionName),
    ).toBe(true);
  });

  it("PDBCS-SEC-02 — Valid secrets file imports into `_pb_config_secrets` collection", async () => {
    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);
    const secrets = await superuserPb.collection(pbConfigSecretsCollectionName).getFullList();
    const indexedSecrets: { [key: string]: string } = {};
    for (const secret of secrets) {
      indexedSecrets[secret.id] = secret.value;
    }
    expect(indexedSecrets).toEqual(validSecretsFileData);
  });
});
