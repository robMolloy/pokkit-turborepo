import { PocketBase } from "@/config/pocketbaseConfig";
import { smartSubscribeToRecordById, useReactiveAuthStore } from "@repo/pokkit-auth";
import { useEffect } from "react";
import { create } from "zustand";
import {
  TUserBalanceRecord,
  userBalanceRecordSchema,
  userBalanceRecordsCollectionName,
} from "./dbUserBalanceRecords";

type TState = TUserBalanceRecord | null | undefined;
export const useUserBalanceRecordStore = create<{
  data: TState;
  setData: (x: TState) => void;
}>()((set) => ({
  data: undefined,
  setData: (data) => set(() => ({ data })),
}));

export const useUserBalanceRecordSync = (p: { pb: PocketBase }) => {
  const reactiveAuthStore = useReactiveAuthStore();
  const userBalanceRecordStore = useUserBalanceRecordStore();

  useEffect(() => {
    if (!reactiveAuthStore) {
      userBalanceRecordStore.setData(reactiveAuthStore);
      return;
    }

    const unsubPromise = smartSubscribeToRecordById({
      pb: p.pb,
      collectionName: userBalanceRecordsCollectionName,
      id: reactiveAuthStore.record.id,
      schema: userBalanceRecordSchema,
      onChange: (x) => userBalanceRecordStore.setData(x),
    });

    return () => {
      unsubPromise.then((x) => x.unsubscribe());
    };
  }, [reactiveAuthStore?.record]);
};
