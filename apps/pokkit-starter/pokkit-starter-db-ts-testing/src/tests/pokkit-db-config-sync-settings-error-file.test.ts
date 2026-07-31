import { killPocketbaseInstanceByDbPortNumber, serveDb } from "@repo/pokkit-testing";
import fse from "fs-extra";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PocketBase } from "../config/pocketbaseConfig";
import { testsMetadata } from "./_testsMetadata";

const sourceDirPath = "./source-build";

const testMetadata = testsMetadata.pokkitDbConfigSyncSettingsErrorFile;
const testSuiteName = testMetadata.name;
const sandboxDbPortNumber = testMetadata.portNumber;

const sandboxDirPath = `_sandboxes/${testSuiteName}`;

let sandboxDbUrl: string | undefined;

const createPbConnection = () => new PocketBase(sandboxDbUrl as string);

describe("pokkit-db config writer settings tests - when settings file does not exist", () => {
  beforeAll(async () => {
    await fse.removeSync(sandboxDirPath);
    await fse.copySync(sourceDirPath, sandboxDirPath);
    await fse.removeSync(sandboxDirPath + "/pb_config/settings.json");
    await fse.writeFileSync(sandboxDirPath + "/pb_config/settings.json", "error");

    const logFilePath = `_logs/${testSuiteName}`;

    const resp = await serveDb({
      dbBuildDirPath: sandboxDirPath,
      dbPortNumber: sandboxDbPortNumber,
      logFilePath,
    });

    sandboxDbUrl = resp.dbUrl;
  });

  afterAll(async () => {
    killPocketbaseInstanceByDbPortNumber(sandboxDbPortNumber);
    fse.removeSync(sandboxDirPath);
  });

  it("connection not healthy", async () => {
    const pb = createPbConnection();
    await expect(pb.health.check()).rejects.toThrow();
  });
});
