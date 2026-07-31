import {
  getPbServeUrl,
  getPokkitDbSettingsFilePath,
  killPbInstance,
  servePb,
} from "@repo/pokkit-testing";
import fse from "fs-extra";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PocketBase } from "../config/pocketbaseConfig";
import { testsMetadata } from "./_testsMetadata";
import { sourcePbDirPath } from "./_constants";

const testMetadata = testsMetadata.pokkitDbConfigSyncSettingsErrorFile;
const testSuiteName = testMetadata.name;

const pbPortNumber = testMetadata.portNumber;
const pbDirPath = `_sandboxes/${testSuiteName}`;
const pbFilePath = pbDirPath + "/app-db";

const pbServeUrl = getPbServeUrl({ pbPortNumber });
const pokkitDbSettingsFilePath = getPokkitDbSettingsFilePath({ pbDirPath });

const createPbConnection = () => new PocketBase(pbServeUrl);

describe("pokkit-db config writer settings tests - when settings file does not exist", () => {
  beforeAll(async () => {
    await killPbInstance({ pbPortNumber });

    fse.removeSync(pbDirPath);
    fse.copySync(sourcePbDirPath, pbDirPath);
    fse.removeSync(pokkitDbSettingsFilePath);
    fse.writeFileSync(pokkitDbSettingsFilePath, "error");

    await servePb({ pbFilePath, pbPortNumber, logFilePath: `_logs/${testSuiteName}` });
  });

  afterAll(async () => {
    killPbInstance({ pbPortNumber });
    fse.removeSync(pbDirPath);
  });

  it("connection not healthy", async () => {
    const pb = createPbConnection();
    await expect(pb.health.check()).rejects.toThrow();
  });
});
