import { type ChildProcessWithoutNullStreams } from "child_process";
import fse from "fs-extra";
import PocketBase, { CollectionModel, UnsubscribeFunc } from "pocketbase";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearDb,
  killPocketbaseInstanceByDbUrl,
  killPocketbaseInstanceBySpawnProcess,
  setupAndServeDb,
} from "@repo/pokkit-testing";
import { act, renderHook, waitFor } from "@testing-library/react";
import {
  useReactiveAuthStoreSync,
  useReactiveAuthStore,
  useUserStore,
  useInitReactiveAuthStore,
} from "./reactiveAuthStore";
import { TUser, userSchema, usersCollectionName } from "./schemas/schemas";
import { RefObject, useEffect, useRef } from "react";

const tempDirPath = `_temp/reactiveAuthStore-test`;
const tempDbBuildFilePath = `${tempDirPath}/app-db`;
const tempDbLogFilePath = `${tempDirPath}/pocketbase.log`;
const tempDbUrl = `http://0.0.0.0:8201`;
const dbSuperuserEmail = "admin@admin.com";
const dbSuperuserPassword = "admin@admin.com";

const createPbInstance = () => new PocketBase(tempDbUrl);

let spawnProcess: ChildProcessWithoutNullStreams | undefined;

const createAsyncSignal = () => {
  let trigger!: () => void;
  const promise = new Promise<void>((resolve) => (trigger = resolve));

  return { promise, trigger };
};

const useUserStoreSync = (p: { pb: PocketBase; id: string }) => {
  const userStore = useUserStore();
  const unsubPromises = useRef<Promise<UnsubscribeFunc>[]>([]);

  useEffect(() => {
    const unsubPromise = p.pb.collection(usersCollectionName).subscribe(p.id, (e) => {
      const parseResp = userSchema.safeParse(e.record);
      if (parseResp.success) userStore.setData(parseResp.data);
    });

    unsubPromises.current.push(unsubPromise);

    return () => {
      unsubPromise.then((unsub) => unsub());
    };
  }, [p.pb, p.id]);

  return { unsubPromises, settle: () => Promise.all(unsubPromises.current) };
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
  }, 5000);

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
  }, 5000);
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
  }, 5000);

  it("useUserStoreSync to update store", async () => {
    const userPb = createPbInstance();
    const email = "new@user2.com";

    await userPb.collection("users").create({ email, password: email, passwordConfirm: email });
    const userResp = await userPb.collection("users").authWithPassword(email, email);

    let result: {
      current: {
        userStore: ReturnType<typeof useUserStore>;
        userStoreSync: ReturnType<typeof useUserStoreSync>;
      };
    };
    await act(async () => {
      const renderHookResp = renderHook(() => ({
        userStore: useUserStore(),
        userStoreSync: useUserStoreSync({ pb: userPb, id: userResp.record.id }),
      }));
      const result1 = renderHookResp.result;
      result = result1;
    });

    await Promise.all(result!.current.userStoreSync.unsubPromises.current);
    // Give SSE time to connect
    // await new Promise((r) => setTimeout(r, 500));

    const createNewName = () => `updated name ${Math.floor(Math.random() * 1000)}`;
    const name = createNewName();
    userPb.collection("users").update(userResp.record.id, { name });

    await waitFor(() => expect(result!.current.userStore.data?.name).toBe(name), { timeout: 5000 });
  }, 5000);

  // it("subscribe to user and update user store hook", async () => {
  //   const { result: userStoreResult } = renderHook(() => useUserStore());

  //   console.log(userStoreResult.current.data?.name);
  //   expect(userStoreResult.current.data?.name).toBeTruthy();
  // }, 5000);
});
