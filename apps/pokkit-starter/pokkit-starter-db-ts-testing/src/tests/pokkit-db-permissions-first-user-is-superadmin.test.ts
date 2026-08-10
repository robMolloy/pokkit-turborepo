import {
  truncatePbCollections,
  getPbFilePath,
  getPbServeUrl,
  globalUserPermissionsCollectionName,
  killPbInstance,
  servePb,
  superusersCollectionName,
  upsertPbAdminCredentialsFromCli,
  usersCollectionName,
} from "@repo/pokkit-testing";
import fse from "fs-extra";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PocketBase } from "../config/pocketbaseConfig";
import { userPayloadBuilder } from "../utils/pocketbaseUserHelpers";
import { sourceTestBuildDirPath, superuserEmail, superuserPassword } from "./_constants";
import { testsMetadata } from "./_testsMetadata";

const testMetadata = testsMetadata.pokkitDbPermissionsFirstUserIsSuperadmin;
const testSuiteName = testMetadata.name;

const pbPortNumber = testMetadata.portNumber;
const pbDirPath = `_sandboxes/${testSuiteName}`;
const pbFilePath = getPbFilePath({ pbDirPath });
const pbServeUrl = getPbServeUrl({ pbPortNumber });

const createPbConnection = () => new PocketBase(pbServeUrl);

describe("pokkit-db permissions first user is superadmin tests", () => {
  beforeAll(async () => {
    await killPbInstance({ pbPortNumber });

    fse.removeSync(pbDirPath);
    fse.copySync(sourceTestBuildDirPath, pbDirPath);

    await servePb({ pbFilePath, pbPortNumber, logFilePath: `_logs/${testSuiteName}` });

    await upsertPbAdminCredentialsFromCli({ pbFilePath, superuserEmail, superuserPassword });
  });

  afterAll(async () => {
    killPbInstance({ pbPortNumber });
    fse.removeSync(pbDirPath);
  });

  beforeEach(async () => {
    await truncatePbCollections({
      pbPortNumber,
      superuserEmail,
      superuserPassword,
      ignoreCollections: [superusersCollectionName],
    });

    await upsertPbAdminCredentialsFromCli({ pbFilePath, superuserEmail, superuserPassword });
  });

  it("is connection healthy", async () => {
    const pb = createPbConnection();
    const isHealthy = await pb.health.check();
    expect(isHealthy.code).toBe(200);
  });

  it("first user is superadmin", async () => {
    const superuserPb = createPbConnection();
    await superuserPb
      .collection(superusersCollectionName)
      .authWithPassword(superuserEmail, superuserPassword);

    const user1Pb = createPbConnection();
    const user1Payload = userPayloadBuilder.forCreateRandomData();
    await user1Pb.collection(usersCollectionName).create(user1Payload);
    const user1 = await user1Pb
      .collection(usersCollectionName)
      .authWithPassword(user1Payload.email, user1Payload.password);

    const globalUserPermissions = await superuserPb
      .collection(globalUserPermissionsCollectionName)
      .getFirstListItem(`userId = "${user1.record.id}"`);
    expect(globalUserPermissions).toBeTruthy();
    expect(globalUserPermissions.role).toBe("superadmin");
    expect(globalUserPermissions.status).toBe("approved");
  });
});
