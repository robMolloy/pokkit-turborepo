import {
  getPbFilePath,
  getPbServeUrl,
  getPokkitDbCollectionsFilePath,
  killPbInstance,
  servePb,
} from "@repo/pokkit-testing";
import fse from "fs-extra";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PocketBase } from "../../config/pocketbaseConfig";
import { sourceTestBuildDirPath } from "../_constants";
import { pokkitDbConfigSyncTestsMetadata } from "./_pokkitDbConfigSyncTestsMetadata";

const testMetadata = pokkitDbConfigSyncTestsMetadata.collectionFileInvalid;
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
    fse.removeSync(getPokkitDbCollectionsFilePath({ pbDirPath }));
    fse.writeFileSync(getPokkitDbCollectionsFilePath({ pbDirPath }), "some invalid JSON");

    const servePbResult = await servePb({ pbFilePath, pbPortNumber, logFilePath });
    expect(servePbResult.success).toBe(false);
  });

  afterAll(async () => {
    killPbInstance({ pbPortNumber });
    fse.removeSync(pbDirPath);
  });

  it("PDBCS-COL-03 — Invalid collections file fails on startup", async () => {
    const pb = createPbConnection();
    try {
      await pb.health.check();
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
    }
  });
});
