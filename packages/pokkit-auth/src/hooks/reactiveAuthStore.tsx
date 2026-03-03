import PocketBase from "pocketbase";
import { useEffect, useRef } from "react";
import { create } from "zustand";
import {
  authStoreSchema,
  TAuthStore,
  TUser,
  userSchema,
  usersCollectionName,
} from "../schemas/schemas";
import { smartSubscribeToRecordById } from "../utils";

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

  return { settle, unsubscribe };
};

export const useReactiveAuthStoreSync = (p: { pb: PocketBase }) => {
  const initReactiveAuthStore = useInitReactiveAuthStore();
  useInitReactiveAuthStoreSync({ pb: p.pb });
  return useUserStoreSync({ pb: p.pb, id: initReactiveAuthStore.data?.record.id });
};

export const useReactiveAuthStore = () => {
  const initReactiveAuthStore = useInitReactiveAuthStore();
  const userStore = useUserStore();

  if (!initReactiveAuthStore.data) return initReactiveAuthStore.data;

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
  useEffect(() => {
    if (!p.pb.authStore.isValid) return initReactiveAuthStore.setData(null);

    const resp = authStoreSchema.safeParse(p.pb.authStore);
    initReactiveAuthStore.setData(resp.success ? resp.data : null);
  }, []);

  useEffect(() => {
    p.pb.authStore.onChange(() => {
      if (!p.pb.authStore.isValid) return initReactiveAuthStore.setData(null);

      const resp = authStoreSchema.safeParse(p.pb.authStore);
      initReactiveAuthStore.setData(resp.success ? resp.data : null);
    });
  }, []);
};

type TCurrentUserState = TUser | null | undefined;
export const useUserStore = create<{
  data: TCurrentUserState;
  setData: (x: TCurrentUserState) => void;
}>()((set) => ({
  data: undefined,
  setData: (data) => set(() => ({ data })),
}));
