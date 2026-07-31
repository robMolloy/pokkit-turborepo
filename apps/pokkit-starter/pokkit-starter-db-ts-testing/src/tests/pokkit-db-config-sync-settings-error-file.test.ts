import { killPocketbaseInstanceByDbPortNumber, servePb } from "@repo/pokkit-testing";
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

let sandboxDbUrl: string | undefined;

const createPbConnection = () => new PocketBase(sandboxDbUrl as string);

describe("pokkit-db config writer settings tests - when settings file does not exist", () => {
  beforeAll(async () => {
    await fse.removeSync(pbDirPath);
    await fse.copySync(sourceDirPath, pbDirPath);
    await fse.removeSync(pbDirPath + "/pb_config/settings.json");
    await fse.writeFileSync(pbDirPath + "/pb_config/settings.json", "error");

    const resp = await servePb({ pbFilePath, pbPortNumber, logFilePath: `_logs/${testSuiteName}` });

    sandboxDbUrl = resp.dbUrl;
  });

  afterAll(async () => {
    killPocketbaseInstanceByDbPortNumber(pbPortNumber);
    fse.removeSync(pbDirPath);
  });

  it("connection not healthy", async () => {
    const pb = createPbConnection();
    await expect(pb.health.check()).rejects.toThrow();
  });
});
