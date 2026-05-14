import PocketBase, { AuthMethodsList } from "pocketbase";
import { useEffect, useRef } from "react";
import { create } from "zustand";
import { listAuthMethods, smartSubscribeToRecordById } from "../utils";
import { authStoreSchema, TAuthStore } from "../utils/dbAuthStoreUtils";
import { TUser, userSchema, usersCollectionName } from "../utils/dbUserUtils";

type TAuthStoreState = TAuthStore | null | undefined;

const smartSubscribeToUserRecordById = (p: {
  pb: PocketBase;
  id: string;
  onChange: (e: TUser | null) => void;
}) =>
  smartSubscribeToRecordById({
    collectionName: usersCollectionName,
    schema: userSchema,
    pb: p.pb,
    id: p.id,
    onChange: p.onChange,
  });

export const useReactiveAuthStoreSync = (p: { pb: PocketBase }) => {
  const initReactiveAuthStore = useInitReactiveAuthStore();
  useInitReactiveAuthStoreSync({ pb: p.pb });
  const userStoreSync = useUserStoreSync({ pb: p.pb, id: initReactiveAuthStore.data?.record.id });

  return userStoreSync;
};

export const useReactiveAuthStore = () => {
  const initReactiveAuthStore = useInitReactiveAuthStore();
  const userStore = useUserStore();

  if (initReactiveAuthStore.data === undefined) return undefined;

  if (initReactiveAuthStore.data === null) return null;
  if (userStore.data === null) return null;

  return {
    ...initReactiveAuthStore.data,
    record: userStore.data ? userStore.data : initReactiveAuthStore.data?.record,
  };
};

export const useInitReactiveAuthStore = create<{
  data: TAuthStoreState;
  setData: (x: TAuthStoreState) => void;
}>()((set) => ({
  data: undefined,
  setData: (data) => set(() => ({ data })),
}));

export const useInitReactiveAuthStoreSync = (p: { pb: PocketBase }) => {
  const initReactiveAuthStore = useInitReactiveAuthStore();

  const syncAuthStore = () => {
    if (!p.pb.authStore.isValid) return initReactiveAuthStore.setData(null);

    const resp = authStoreSchema.safeParse(p.pb.authStore);

    initReactiveAuthStore.setData(resp.success ? resp.data : null);
  };

  useEffect(() => syncAuthStore(), []);

  useEffect(() => {
    p.pb.authStore.onChange(() => syncAuthStore());
  }, []);
};

export const useUserStoreSync = (p: { pb: PocketBase; id: string | undefined }) => {
  const userStore = useUserStore();
  const smartSubscribeRespPromises = useRef<ReturnType<typeof smartSubscribeToUserRecordById>[]>(
    [],
  );

  const settle = async () => {
    const smartSubscribeResps = await Promise.all(smartSubscribeRespPromises.current);

    const unsubFnPromises = smartSubscribeResps
      .filter((smartSubscribeResp) => smartSubscribeResp.success)
      .map((smartSubscribeResp) => smartSubscribeResp.data);

    return Promise.all(unsubFnPromises);
  };

  const unsubscribe = async () => {
    const unsubFns = await settle();
    unsubFns.forEach((unsub) => unsub());
  };

  const abortController = useRef(new AbortController());

  useEffect(() => {
    const id = p.id;
    if (id === undefined) return;

    const resp = smartSubscribeToUserRecordById({
      id,
      pb: p.pb,
      onChange: (x) => userStore.setData(x),
    });

    smartSubscribeRespPromises.current.push(resp);

    return () => {
      abortController.current.abort();
      unsubscribe();
    };
  }, [p.pb, p.id]);

  return { settle, unsubscribe, user: userStore.data };
};

type TCurrentUserState = TUser | null | undefined;
export const useUserStore = create<{
  data: TCurrentUserState;
  setData: (x: TCurrentUserState) => void;
}>()((set) => ({
  data: undefined,
  setData: (data) => set(() => ({ data })),
}));

export const useAuthMethodsListStoreSync = (p: { pb: PocketBase }) => {
  const authMethodsListStore = useAuthMethodsListStore();

  useEffect(() => {
    (async () => {
      const authMethodsListResp = await listAuthMethods({ pb: p.pb });
      authMethodsListStore.setData(authMethodsListResp.success ? authMethodsListResp.data : null);
    })();
  }, []);
};

type TAuthMethodsListState = AuthMethodsList | null | undefined;
export const useAuthMethodsListStore = create<{
  data: TAuthMethodsListState;
  setData: (x: TAuthMethodsListState) => void;
}>()((set) => ({
  data: undefined,
  setData: (data) => set(() => ({ data })),
}));
