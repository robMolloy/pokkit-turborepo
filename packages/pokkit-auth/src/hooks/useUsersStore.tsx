import PocketBase from "pocketbase";
import { useReactiveAuthStore } from "./reactiveAuthStore";
import { useEffect } from "react";
import { smartSubscribeToAllRecords, TUser, userSchema, usersCollectionName } from "../utils";
import { create } from "zustand";

type TUsersStoreState = TUser[] | undefined | null;

export const useUserRecordsStore = create<{
  data: TUsersStoreState;
  setData: (x: TUsersStoreState) => void;
}>()((set) => ({
  data: undefined,
  setData: (data) => set(() => ({ data })),
}));

export const useUserRecordsSync = (p: { pb: PocketBase }) => {
  const reactiveAuthStore = useReactiveAuthStore();
  const usersStore = useUserRecordsStore();

  useEffect(() => {
    const unsubPromise = smartSubscribeToAllRecords({
      pb: p.pb,
      collectionName: usersCollectionName,
      itemSchema: userSchema,
      onChange: (x) => usersStore.setData(x),
    });

    return () => {
      unsubPromise.then((x) => x.unsubscribe());
    };
  }, [reactiveAuthStore?.record.id]);
};
