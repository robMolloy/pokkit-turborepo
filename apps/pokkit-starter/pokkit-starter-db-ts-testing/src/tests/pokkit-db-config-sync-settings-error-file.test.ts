import { createPbServeUrl, killPbInstance, servePb } from "@repo/pokkit-testing";
import fse from "fs-extra";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PocketBase } from "../config/pocketbaseConfig";
import { testsMetadata } from "./_testsMetadata";

const sourceDirPath = "./source-build";

const testMetadata = testsMetadata.pokkitDbConfigSyncSettingsErrorFile;
const testSuiteName = testMetadata.name;

const pbPortNumber = testMetadata.portNumber;
const pbDirPath = `_sandboxes/${testSuiteName}`;
const pbFilePath = pbDirPath + "/app-db";

const pbServeUrl = createPbServeUrl({ pbPortNumber });

const createPbConnection = () => new PocketBase(pbServeUrl);

describe("pokkit-db config writer settings tests - when settings file does not exist", () => {
  beforeAll(async () => {
    await killPbInstance({ pbPortNumber });

    fse.removeSync(pbDirPath);
    fse.copySync(sourceDirPath, pbDirPath);
    fse.removeSync(pbDirPath + "/pb_config/settings.json");
    fse.writeFileSync(pbDirPath + "/pb_config/settings.json", "error");

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
