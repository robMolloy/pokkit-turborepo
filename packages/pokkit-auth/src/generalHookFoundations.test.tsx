import {
  clearDb,
  killPocketbaseInstanceByDbUrl,
  killPocketbaseInstanceBySpawnProcess,
  setupAndServeDb,
} from "@repo/pokkit-testing";
import { act, renderHook, waitFor } from "@testing-library/react";
import { type ChildProcessWithoutNullStreams } from "child_process";
import fse from "fs-extra";
import PocketBase, { CollectionModel } from "pocketbase";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { useUserStore } from "./reactiveAuthStore";
import { userSchema, usersCollectionName } from "./schemas/schemas";

const tempDirPath = `_temp/generalHookFoundations-test`;
const tempDbBuildFilePath = `${tempDirPath}/app-db`;
const tempDbLogFilePath = `${tempDirPath}/pocketbase.log`;
const tempDbUrl = `http://0.0.0.0:8200`;
const dbSuperuserEmail = "admin@admin.com";
const dbSuperuserPassword = "admin@admin.com";

const createPbInstance = () => new PocketBase(tempDbUrl);

let spawnProcess: ChildProcessWithoutNullStreams | undefined;

const createAsyncSignal = () => {
  let trigger!: () => void;
  const promise = new Promise<void>((resolve) => (trigger = resolve));

  return { promise, trigger };
};

describe("pokkit-testing setupAndServeDb", () => {
  beforeAll(async () => {
    await killPocketbaseInstanceByDbUrl(tempDbUrl);
    if (spawnProcess) await killPocketbaseInstanceBySpawnProcess(spawnProcess);

    spawnProcess = await setupAndServeDb({
      getCollectionsFn: async () => {
        const collectionsString = fse.readFileSync("./pocketbase/collections.json", "utf-8");
        return JSON.parse(collectionsString) as CollectionModel[];
      },
      writeDbBuildToFilePathFn: async () => {
        fse.ensureFileSync(tempDbBuildFilePath);
        fse.copyFileSync(`./pocketbase/app-db`, tempDbBuildFilePath);
      },
      dbUrl: tempDbUrl,
      dbSuperuserEmail: dbSuperuserEmail,
      dbSuperuserPassword: dbSuperuserPassword,
      dbBuildFilePath: tempDbBuildFilePath,
      dbLogFilePath: tempDbLogFilePath,
    });
  });

  afterAll(async () => {
    if (spawnProcess) await killPocketbaseInstanceBySpawnProcess(spawnProcess);
    await killPocketbaseInstanceByDbUrl(tempDbUrl);
    spawnProcess = undefined;

    // fse.removeSync(tempDirPath);
  });

  beforeEach(async () => {
    await clearDb({ dbUrl: tempDbUrl, dbSuperuserEmail, dbSuperuserPassword });
  });

  it("subscribe to user test", async () => {
    let eventCount = 0;
    const asyncSignal = createAsyncSignal();

    const userPb = createPbInstance();
    const email = "new@user2.com";

    await userPb.collection("users").create({ email, password: email, passwordConfirm: email });
    const userResp = await userPb.collection("users").authWithPassword(email, email);

    const unsub = await userPb
      .collection(usersCollectionName)
      .subscribe(userResp.record.id, (e) => {
        const parseResp = userSchema.safeParse(e.record);
        expect(parseResp.success).toBe(true);

        eventCount += 1;
        if (eventCount === 3) asyncSignal.trigger();
      });

    const createNewName = () => `updated name ${Math.floor(Math.random() * 1000)}`;

    await userPb.collection("users").update(userResp.record.id, { name: createNewName() });
    await userPb.collection("users").update(userResp.record.id, { name: createNewName() });
    await userPb.collection("users").update(userResp.record.id, { name: createNewName() });

    await asyncSignal.promise;

    expect(eventCount).toBe(3);

    unsub();
  });

  it("subscribe to user and update store", async () => {
    const asyncSignal = createAsyncSignal();

    const { result: userStoreResult } = renderHook(() => useUserStore());

    const userPb = createPbInstance();
    const email = "new@user2.com";

    await userPb.collection("users").create({ email, password: email, passwordConfirm: email });
    const userResp = await userPb.collection("users").authWithPassword(email, email);

    const unsub = await userPb
      .collection(usersCollectionName)
      .subscribe(userResp.record.id, (e) => {
        const parseResp = userSchema.safeParse(e.record);
        expect(parseResp.success).toBe(true);

        act(() => userStoreResult.current.setData(parseResp.data));

        asyncSignal.trigger();
      });

    const createNewName = () => `updated name ${Math.floor(Math.random() * 1000)}`;

    const name = createNewName();
    await userPb.collection("users").update(userResp.record.id, { name });

    await asyncSignal.promise;

    expect(userStoreResult.current.data?.name).toBe(name);

    unsub();
  });

  it("subscribe to user and update store - use waitFor instead of async signal", async () => {
    const { result: userStoreResult } = renderHook(() => useUserStore());

    const userPb = createPbInstance();
    const email = "new@user2.com";

    await userPb.collection("users").create({ email, password: email, passwordConfirm: email });
    const userResp = await userPb.collection("users").authWithPassword(email, email);

    const unsub = await userPb
      .collection(usersCollectionName)
      .subscribe(userResp.record.id, (e) => {
        const parseResp = userSchema.safeParse(e.record);
        expect(parseResp.success).toBe(true);

        act(() => userStoreResult.current.setData(parseResp.data));
      });

    const createNewName = () => `updated name ${Math.floor(Math.random() * 1000)}`;

    const name = createNewName();
    await userPb.collection("users").update(userResp.record.id, { name });

    await waitFor(() => expect(userStoreResult.current.data?.name).toBe(name));

    unsub();
  });
});
