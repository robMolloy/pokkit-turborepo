import {
  clearDb,
  killPocketbaseInstanceByDbUrl,
  killPocketbaseInstanceBySpawnProcess,
  setupAndServeDb,
} from "@repo/pokkit-testing";
import { act, renderHook, waitFor } from "@testing-library/react";
import { type ChildProcessWithoutNullStreams } from "child_process";
import fse from "fs-extra";
import PocketBase, { CollectionModel, UnsubscribeFunc } from "pocketbase";
import { useEffect, useRef } from "react";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  useInitReactiveAuthStore,
  useInitReactiveAuthStoreSync,
  useUserStore,
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

const useInitUserStoreSync = (p: { pb: PocketBase; id: string | undefined }) => {
  const userStore = useUserStore();
  const unsubPromises = useRef<Promise<UnsubscribeFunc>[]>([]);

  const abortController = useRef(new AbortController());

  useEffect(() => {
    if (p.id === undefined) return;

    const userRecord = p.pb
      .collection(usersCollectionName)
      .getOne(p.id, { signal: abortController.current.signal });

    const parseResp = userSchema.safeParse(userRecord);
    if (parseResp.success) userStore.setData(parseResp.data);

    return () => {
      abortController.current.abort();
    };
  }, [p.pb, p.id]);

  useEffect(() => {
    if (p.id === undefined) return;
    const unsubPromise = p.pb.collection(usersCollectionName).subscribe(
      p.id,
      (e) => {
        const parseResp = userSchema.safeParse(e.record);
        if (parseResp.success) userStore.setData(parseResp.data);
      },
      { signal: abortController.current.signal },
    );

    unsubPromises.current.push(unsubPromise);

    return () => {
      abortController.current.abort();
      unsubPromise.then((unsub) => unsub());
    };
  }, [p.pb, p.id]);

  return { unsubPromises, settle: () => Promise.all(unsubPromises.current) };
};

const useReactiveAuthStoreSync = (p: { pb: PocketBase }) => {
  const initReactiveAuthStore = useInitReactiveAuthStore();
  useInitReactiveAuthStoreSync({ pb: p.pb });
  return useInitUserStoreSync({ pb: p.pb, id: initReactiveAuthStore.data?.record.id });
};

const useReactiveAuthStore = () => {
  const initReactiveAuthStore = useInitReactiveAuthStore();
  const userStore = useUserStore();

  return {
    ...initReactiveAuthStore.data,
    record: userStore.data ? userStore.data : initReactiveAuthStore.data?.record,
  };
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

  it("useUserStoreSync to update store", async () => {
    const userPb = createPbInstance();
    const email = "new@user2.com";

    await userPb.collection("users").create({ email, password: email, passwordConfirm: email });
    const userResp = await userPb.collection("users").authWithPassword(email, email);

    const { result } = await act(async () =>
      renderHook(() => ({
        userStore: useUserStore(),
        userInitStoreSync: useInitUserStoreSync({ pb: userPb, id: userResp.record.id }),
      })),
    );

    await result.current.userInitStoreSync.settle();

    const createNewName = () => `updated name ${Math.floor(Math.random() * 1000)}`;
    const name = createNewName();
    userPb.collection("users").update(userResp.record.id, { name });

    await waitFor(() => expect(result.current.userStore.data?.name).toBe(name), { timeout: 5000 });
  });

  it("useReactiveAuthStoreSync to update store", async () => {
    const superuserPb = createPbInstance();
    await superuserPb
      .collection("_superusers")
      .authWithPassword(dbSuperuserEmail, dbSuperuserPassword);

    const userPb = createPbInstance();
    const email = "new@user2.com";

    await userPb.collection("users").create({ email, password: email, passwordConfirm: email });
    const userResp = await userPb.collection("users").authWithPassword(email, email);

    const { result } = await act(async () =>
      renderHook(() => ({
        useReactiveAuthStore: useReactiveAuthStore(),
        useReactiveAuthStoreSync: useReactiveAuthStoreSync({ pb: userPb }),
      })),
    );

    await result.current.useReactiveAuthStoreSync.settle();

    const createNewName = () => `updated name ${Math.floor(Math.random() * 1000)}`;
    const name = createNewName();
    userPb.collection("users").update(userResp.record.id, { name });

    await waitFor(
      () => {
        expect(result.current.useReactiveAuthStore.record?.name).toBe(name);
      },
      { timeout: 500 },
    );

    superuserPb.collection("users").update(userResp.record.id, { name: `updated${name}` });
    await waitFor(
      () => {
        expect(result.current.useReactiveAuthStore.record?.name).toBe(`updated${name}`);
      },
      { timeout: 500 },
    );
  });
});
