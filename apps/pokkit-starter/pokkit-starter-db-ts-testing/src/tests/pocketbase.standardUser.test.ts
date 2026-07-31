import {
  clearPb,
  getPbServeUrl,
  killPbInstance,
  servePb,
  upsertAdminCredentialsFromCli,
} from "@repo/pokkit-testing";
import fse from "fs-extra";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PocketBase } from "../config/pocketbaseConfig";
import { usersCollectionName } from "../metadata/pocketbaseMetadata";
import { userPayloadBuilder } from "../utils/pocketbaseUserHelpers";
import { superuserEmail, superuserPassword } from "./_constants";
import { testsMetadata } from "./_testsMetadata";

const sourceDirPath = "./source-build";

const testMetadata = testsMetadata.pocketbaseStandardUser;
const testSuiteName = testMetadata.name;
const pbPortNumber = testMetadata.portNumber;

const pbDirPath = `_sandboxes/${testSuiteName}`;
const pbFilePath = pbDirPath + "/app-db";

const pbServeUrl = getPbServeUrl({ pbPortNumber });

const createPbConnection = () => new PocketBase(pbServeUrl);

describe("test rules", () => {
  beforeAll(async () => {
    await killPbInstance({ pbPortNumber });

    fse.removeSync(pbDirPath);
    fse.copySync(sourceDirPath, pbDirPath);

    await servePb({ pbFilePath, pbPortNumber, logFilePath: `_logs/${testSuiteName}` });

    await upsertAdminCredentialsFromCli({ pbFilePath, superuserEmail, superuserPassword });
  });

  afterAll(async () => {
    killPbInstance({ pbPortNumber });
    await fse.remove(pbDirPath);
  });

  beforeEach(async () => {
    await clearPb({ pbPortNumber, superuserEmail, superuserPassword });
  });

  it("is connection healthy", async () => {
    const pb = createPbConnection();
    const isHealthy = await pb.health.check();
    expect(isHealthy.code).toBe(200);
  });

  it("rejects invalid authentication", async () => {
    const pb = createPbConnection();
    expect(pb).toBeInstanceOf(PocketBase);
    const userPb = createPbConnection();
    await expect(
      userPb.collection(usersCollectionName).authWithPassword("test@example.com", "wrong-password"),
    ).rejects.toThrow();
  });

  it("allow create:  user with valid email and password", async () => {
    const userPb = createPbConnection();

    // throwaway record - first user gains an approved admin global permission
    await userPb.collection(usersCollectionName).create(userPayloadBuilder.forCreateRandomData());

    const userData = userPayloadBuilder.forCreateRandomData();
    const resp = await userPb.collection(usersCollectionName).create({
      email: userData.email,
      password: userData.password,
      passwordConfirm: userData.password,
    });
    expect(resp.id).not.toBeNull();
  });

  it("deny read: user record when not authenticated; allow read: of own user record when authenticated; deny read: of other user records when authenticated", async () => {
    const userPb = createPbConnection();

    // throwaway record - first user gains an approved admin global permission
    await userPb.collection(usersCollectionName).create(userPayloadBuilder.forCreateRandomData());

    const userData1 = userPayloadBuilder.forCreateRandomData();
    const userRecord1 = await userPb.collection(usersCollectionName).create({
      email: userData1.email,
      password: userData1.password,
      passwordConfirm: userData1.password,
    });
    const userData2 = userPayloadBuilder.forCreateRandomData();
    const userRecord2 = await userPb.collection(usersCollectionName).create({
      email: userData2.email,
      password: userData2.password,
      passwordConfirm: userData2.password,
    });

    // Verify unauthenticated access is denied
    await expect(userPb.collection(usersCollectionName).getOne(userRecord1.id)).rejects.toThrow();
    //
    // Authenticate as user 1
    await userPb
      .collection(usersCollectionName)
      .authWithPassword(userData1.email, userData1.password);

    // Verify authenticated access is allowed
    const record = await userPb.collection(usersCollectionName).getOne(userRecord1.id);
    expect(record.id).toBe(userRecord1.id);

    // Verify authenticated access is denied for other user records
    await expect(userPb.collection(usersCollectionName).getOne(userRecord2.id)).rejects.toThrow();
  });

  it("allow list: standard user returns list with only own record when authenticated; allow list: when not authenticated list returns empty array", async () => {
    const userPb = createPbConnection();

    // throwaway record - first user gains an approved admin global permission
    await userPb.collection(usersCollectionName).create(userPayloadBuilder.forCreateRandomData());

    const userData1 = userPayloadBuilder.forCreateRandomData();
    const userRecord1 = await userPb.collection(usersCollectionName).create({
      email: userData1.email,
      password: userData1.password,
      passwordConfirm: userData1.password,
    });
    const userData2 = userPayloadBuilder.forCreateRandomData();
    await userPb.collection(usersCollectionName).create({
      email: userData2.email,
      password: userData2.password,
      passwordConfirm: userData2.password,
    });

    // Verify unauthenticated access is denied
    const unauthRecords = await userPb.collection(usersCollectionName).getFullList();

    expect(unauthRecords.length).toBe(0);

    // Authenticate as user 1
    await userPb
      .collection(usersCollectionName)
      .authWithPassword(userData1.email, userData1.password);

    // Verify list returns only own record
    const records = await userPb.collection(usersCollectionName).getFullList();
    expect(records.length).toBe(1);
    expect(records[0]?.id).toBe(userRecord1.id);
  });
});
