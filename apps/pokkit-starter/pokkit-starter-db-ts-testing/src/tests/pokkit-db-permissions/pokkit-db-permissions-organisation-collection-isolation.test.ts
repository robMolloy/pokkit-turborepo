import {
  getPbFilePath,
  getPbServeUrl,
  killPbInstance,
  servePb,
  superusersCollectionName,
  truncatePbCollections,
  upsertPbAdminCredentialsFromCli,
  usersCollectionName,
} from "@repo/pokkit-testing";
import fse from "fs-extra";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PocketBase } from "../../config/pocketbaseConfig";
import { sourceTestBuildDirPath, superuserEmail, superuserPassword } from "../_constants";
import { pokkitDbPermissionsTestsMetadata } from "./_pokkitDbConfigSyncTestsMetadata";
import { userPayloadBuilder } from "@repo/pokkit-db-permissions-ts-helpers";
import {
  organisationsCollectionName,
  organisationsPayloadBuilder,
} from "@repo/pokkit-db-permissions-ts-helpers";

const testMetadata =
  pokkitDbPermissionsTestsMetadata.pokkitDbPermissionsOrganisationsCollectionIsolation;
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

    await servePb({ pbFilePath, pbPortNumber, logFilePath });
    await upsertPbAdminCredentialsFromCli({ pbFilePath, superuserEmail, superuserPassword });
  });

  afterAll(async () => {
    killPbInstance({ pbPortNumber });
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

  it("PDBP-ORG-ISOLATION-CREATE-OTHER-01 — Organisation Admin (approved) cannot CREATE other org", async () => {
    const superadminPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminPb.collection(usersCollectionName).create(superadminUserPayload);
    await superadminPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    const organisation1Payload = organisationsPayloadBuilder.forCreateRandomData();
    await superadminPb.collection(organisationsCollectionName).create(organisation1Payload);

    const organisation1AdminPb = createPbConnection();
    const organisation1AdminUserPayload = userPayloadBuilder.forCreateRandomData();
    await organisation1AdminPb
      .collection(usersCollectionName)
      .create(organisation1AdminUserPayload);
    await organisation1AdminPb
      .collection(usersCollectionName)
      .authWithPassword(
        organisation1AdminUserPayload.email,
        organisation1AdminUserPayload.password,
      );

    const organisation2Payload = organisationsPayloadBuilder.forCreateRandomData();
    await expect(
      organisation1AdminPb.collection(organisationsCollectionName).create(organisation2Payload),
    ).rejects.toThrow();
  });
  it("PDBP-ORG-ISOLATION-UPDATE-OTHER-01 — Organisation Admin (approved) cannot UPDATE other org", async () => {
    const superadminPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminPb.collection(usersCollectionName).create(superadminUserPayload);
    await superadminPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    const organisation1Payload = organisationsPayloadBuilder.forCreateRandomData();
    await superadminPb.collection(organisationsCollectionName).create(organisation1Payload);

    const organisation2Payload = organisationsPayloadBuilder.forCreateRandomData();
    const organisation2Record = await superadminPb
      .collection(organisationsCollectionName)
      .create(organisation2Payload);

    const organisation1AdminPb = createPbConnection();
    const organisation1AdminUserPayload = userPayloadBuilder.forCreateRandomData();
    await organisation1AdminPb
      .collection(usersCollectionName)
      .create(organisation1AdminUserPayload);
    await organisation1AdminPb
      .collection(usersCollectionName)
      .authWithPassword(
        organisation1AdminUserPayload.email,
        organisation1AdminUserPayload.password,
      );

    await expect(
      organisation1AdminPb
        .collection(organisationsCollectionName)
        .update(organisation2Record.id, { ...organisation2Payload, name: "Updated Organisation" }),
    ).rejects.toThrow();
  });
  it("PDBP-ORG-ISOLATION-DELETE-OTHER-01 — Organisation Admin (approved) cannot DELETE other org", async () => {
    const superadminPb = createPbConnection();
    const superadminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminPb.collection(usersCollectionName).create(superadminUserPayload);
    await superadminPb
      .collection(usersCollectionName)
      .authWithPassword(superadminUserPayload.email, superadminUserPayload.password);

    const organisation1Payload = organisationsPayloadBuilder.forCreateRandomData();
    await superadminPb.collection(organisationsCollectionName).create(organisation1Payload);

    const organisation2Payload = organisationsPayloadBuilder.forCreateRandomData();
    const organisation2Record = await superadminPb
      .collection(organisationsCollectionName)
      .create(organisation2Payload);

    const organisation1AdminPb = createPbConnection();
    const organisation1AdminUserPayload = userPayloadBuilder.forCreateRandomData();
    await organisation1AdminPb
      .collection(usersCollectionName)
      .create(organisation1AdminUserPayload);
    await organisation1AdminPb
      .collection(usersCollectionName)
      .authWithPassword(
        organisation1AdminUserPayload.email,
        organisation1AdminUserPayload.password,
      );

    await expect(
      organisation1AdminPb.collection(organisationsCollectionName).delete(organisation2Record.id),
    ).rejects.toThrow();
  });
});
