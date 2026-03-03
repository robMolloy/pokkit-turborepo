import PocketBase, { UnsubscribeFunc } from "pocketbase";
import { useEffect, useRef } from "react";
import { create } from "zustand";
import {
  authStoreSchema,
  TAuthStore,
  TUser,
  userSchema,
  usersCollectionName,
} from "./schemas/schemas";

const getUser = async (p: { pb: PocketBase; id: string }) => {
  try {
    const userResp = await p.pb.collection(usersCollectionName).getOne(p.id);
    return userSchema.safeParse(userResp);
  } catch (e) {
    const error = e as { message: string };
    return { success: false, error } as const;
  }
};

const subscribeToUser = async (p: {
  pb: PocketBase;
  id: string;
  onChange: (e: TUser | null) => void;
}) => {
  try {
    const unsubPromise = p.pb.collection(usersCollectionName).subscribe(p.id, (e) => {
      const parseResp = userSchema.safeParse(e.record);
      p.onChange(parseResp.success ? parseResp.data : null);
    });
    const userRespPromise = getUser({ pb: p.pb, id: p.id });

    // subscription must be complete to avoid any race conditions issues
    // avoid using promises.all to be explicit
    const unsub = await unsubPromise;
    const userResp = await userRespPromise;

    p.onChange(userResp.success ? userResp.data : null);

    return { success: true, data: unsub } as const;
  } catch (error) {
    p.onChange(null);
    return { success: false, error } as const;
  }
};

type TAuthStoreState = TAuthStore | null | undefined;

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

export const useReactiveAuthStoreSync = (p: { pb: PocketBase }) => {
  useInitReactiveAuthStoreSync(p);

  const initReactiveAuthStore = useInitReactiveAuthStore();
  const userStore = useUserStore();

  const xRef = useRef<UnsubscribeFunc[]>([]);

  useEffect(() => {
    (async () => {
      if (!initReactiveAuthStore.data?.record.id) return userStore.setData(null);

      const subResp = await subscribeToUser({
        pb: p.pb,
        id: initReactiveAuthStore.data.record.id,
        onChange: (x) => {
          userStore.setData(x);
        },
      });
      if (subResp.success) xRef.current.push(subResp.data);
    })();

    return () => {
      xRef.current.forEach((x) => x());
      xRef.current = [];
    };
  }, [initReactiveAuthStore.data]);

  if (!initReactiveAuthStore.data) return { data: initReactiveAuthStore.data };
  return { data: { ...initReactiveAuthStore.data, record: userStore.data } };
};

export const useReactiveAuthStore = () => {
  const initReactiveAuthStore = useInitReactiveAuthStore();
  const userStore = useUserStore();

  if (!initReactiveAuthStore.data) return { data: initReactiveAuthStore.data };
  return {
    data: {
      ...initReactiveAuthStore.data,
      record: userStore.data ? userStore.data : initReactiveAuthStore.data.record,
    },
  };
};
