import {
  clearPb,
  getPbFilePath,
  getPbServeUrl,
  getPokkitDbCollectionsFilePathh,
  killPbInstance,
  servePb,
  superusersCollectionName,
  upsertPbAdminCredentialsFromCli,
} from "@repo/pokkit-testing";
import fse from "fs-extra";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PocketBase } from "../../config/pocketbaseConfig";
import { sourceTestBuildDirPath, superuserEmail, superuserPassword } from "../_constants";
import { pokkitDbConfigSyncTestsMetadata } from "./_pokkitDbConfigSyncTestsMetadata";
import { validCollectionFileData } from "./mocks/validCollectionFileData";

const testMetadata = pokkitDbConfigSyncTestsMetadata.invalidCollectionFile;
const testSuiteName = testMetadata.name;

const pbPortNumber = testMetadata.portNumber;
const pbDirPath = `_sandboxes/${testSuiteName}`;
const pbFilePath = getPbFilePath({ pbDirPath });
const pbServeUrl = getPbServeUrl({ pbPortNumber });

const createPbConnection = () => new PocketBase(pbServeUrl);

describe(`${testSuiteName} tests`, () => {
  beforeAll(async () => {
    await killPbInstance({ pbPortNumber });
    fse.removeSync(pbDirPath);
    fse.copySync(sourceTestBuildDirPath, pbDirPath);
    fse.removeSync(getPokkitDbCollectionsFilePathh({ pbDirPath }));
    fse.writeFileSync(getPokkitDbCollectionsFilePathh({ pbDirPath }), "some invalid JSON");
    const servePbResult = await servePb({
      pbFilePath,
      pbPortNumber,
      logFilePath: `_logs/${testSuiteName}`,
    });
    expect(servePbResult.success).toBe(false);
  });

  afterAll(async () => {
    killPbInstance({ pbPortNumber });
    fse.removeSync(pbDirPath);
  });

  it("is connection unhealthy", async () => {
    const pb = createPbConnection();
    try {
      const isHealthy = await pb.health.check();
      expect(isHealthy.code).toBe(200);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
    }
  });
});
