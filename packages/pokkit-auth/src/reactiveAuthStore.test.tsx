import { type ChildProcessWithoutNullStreams } from "child_process";
import fse from "fs-extra";
import PocketBase, { CollectionModel } from "pocketbase";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearDb,
  killPocketbaseInstanceByDbUrl,
  killPocketbaseInstanceBySpawnProcess,
  setupAndServeDb,
} from "@repo/pokkit-testing";
import { act, renderHook } from "@testing-library/react";
import {
  useReactiveAuthStoreSync,
  useReactiveAuthStore,
  useUserStore,
  useInitReactiveAuthStore,
} from "./reactiveAuthStore";
import { userSchema, usersCollectionName } from "./schemas/schemas";

const tempDirPath = `_temp/reactiveAuthStore-test`;
const tempDbBuildFilePath = `${tempDirPath}/app-db`;
const tempDbLogFilePath = `${tempDirPath}/pocketbase.log`;
const tempDbUrl = `http://0.0.0.0:8201`;
const dbSuperuserEmail = "admin@admin.com";
const dbSuperuserPassword = "admin@admin.com";

const createPbInstance = () => new PocketBase(tempDbUrl);

let spawnProcess: ChildProcessWithoutNullStreams | undefined;

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

  it.skip("reactive auth store updates on login", async () => {
    const superuserPb = createPbInstance();
    await superuserPb
      .collection("_superusers")
      .authWithPassword(dbSuperuserEmail, dbSuperuserPassword);

    const userPb = createPbInstance();

    renderHook(() => useReactiveAuthStoreSync({ pb: userPb }));

    const { result: reactiveAuthStoreResult } = renderHook(() => useReactiveAuthStore());
    const { result: initReactiveAuthStoreResult } = renderHook(() => useInitReactiveAuthStore());
    const { result: userStoreResult } = renderHook(() => useUserStore());

    expect(reactiveAuthStoreResult.current.data).toBeFalsy();
    await userPb.collection("users").create({
      email: "new@user.com",
      password: "new@user.com",
      passwordConfirm: "new@user.com",
    });

    const resp = await act(async () => {
      return await userPb.collection("users").authWithPassword("new@user.com", "new@user.com");
    });

    expect(reactiveAuthStoreResult.current.data).toBeTruthy();
    expect(reactiveAuthStoreResult.current.data?.record?.email).toBe("new@user.com");

    await superuserPb.collection("users").update(resp.record.id, { name: "Updated Name" });
    const userList = await superuserPb.collection("users").getFullList();

    const getUser = async (p: { pb: PocketBase; id: string }) => {
      try {
        const userResp = await p.pb.collection(usersCollectionName).getOne(p.id);
        return userSchema.safeParse(userResp);
      } catch (e) {
        const error = e as { message: string };
        return { success: false, error } as const;
      }
    };
    await getUser({ pb: userPb, id: resp.record.id });
    await getUser({ pb: userPb, id: resp.record.id });
    await getUser({ pb: userPb, id: resp.record.id });

    expect(userStoreResult.current.data?.name).toBe("Updated Name");

    expect(userList[0].name).toBe("Updated Name");
    expect(reactiveAuthStoreResult.current.data?.record?.name).toBe("Updated Name");

    await userPb.authStore.clear();
    expect(reactiveAuthStoreResult.current.data).toBeFalsy();
  });

  it("subscribe to user test", async () => {
    const listener = vi.fn();

    const superuserPb = createPbInstance();
    await superuserPb
      .collection("_superusers")
      .authWithPassword(dbSuperuserEmail, dbSuperuserPassword);

    const userPb = createPbInstance();
    await userPb.collection("users").create({
      email: "new@user2.com",
      password: "new@user2.com",
      passwordConfirm: "new@user2.com",
    });
    const userResp = await userPb
      .collection("users")
      .authWithPassword("new@user2.com", "new@user2.com");
    const unsub = await userPb
      .collection(usersCollectionName)
      .subscribe(userResp.record.id, (e) => {
        listener();
        const parseResp = userSchema.safeParse(e.record);

        expect(parseResp.success).toBe(true);
      });

    await superuserPb.collection("users").update(userResp.record.id, {
      name: `updated name ${Math.floor(Math.random() * 1000)}`,
    });
    await superuserPb.collection("users").update(userResp.record.id, {
      name: `updated name ${Math.floor(Math.random() * 1000)}`,
    });
    await superuserPb.collection("users").update(userResp.record.id, {
      name: `updated name ${Math.floor(Math.random() * 1000)}`,
    });

    expect(listener).toHaveBeenCalledTimes(3);

    unsub();
  });
});
