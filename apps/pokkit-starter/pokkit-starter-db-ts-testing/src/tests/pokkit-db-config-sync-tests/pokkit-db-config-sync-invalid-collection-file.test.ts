import {
  getPbFilePath,
  getPbServeUrl,
  getPokkitDbCollectionsFilePathh,
  killPbInstance,
  servePb,
} from "@repo/pokkit-testing";
import fse from "fs-extra";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PocketBase } from "../../config/pocketbaseConfig";
import { sourceTestBuildDirPath } from "../_constants";
import { pokkitDbConfigSyncTestsMetadata } from "./_pokkitDbConfigSyncTestsMetadata";

const testMetadata = pokkitDbConfigSyncTestsMetadata.invalidCollectionFile;
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
    fse.removeSync(getPokkitDbCollectionsFilePathh({ pbDirPath }));
    fse.writeFileSync(getPokkitDbCollectionsFilePathh({ pbDirPath }), "some invalid JSON");

    const servePbResult = await servePb({ pbFilePath, pbPortNumber, logFilePath });
    expect(servePbResult.success).toBe(false);
  });

  afterAll(async () => {
    killPbInstance({ pbPortNumber });
    fse.removeSync(pbDirPath);
  });

  it("is connection unhealthy", async () => {
    const pb = createPbConnection();
    try {
      await pb.health.check();
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
    }
  });
});
