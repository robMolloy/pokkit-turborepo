import { PocketBase } from "@/config/pocketbaseConfig";
import { smartSubscribeToAllRecords, useReactiveAuthStore } from "@repo/pokkit-auth";
import { useEffect } from "react";
import z from "zod";
import { create } from "zustand";

export const userBalanceRecordsCollectionName = "userBalances";
export const userBalanceRecordSchema = z.object({
  id: z.string(),
  userId: z.string(),
  tokenAmount: z.number(),
  created: z.string(),
  updated: z.string(),
});
export type TUserBalanceRecord = z.infer<typeof userBalanceRecordSchema>;

export type TState = TUserBalanceRecord[] | null | undefined;
export const useUserBalanceRecordsStore = create<{
  data: TState;
  setData: (x: TState) => void;
}>()((set) => ({
  data: undefined,
  setData: (data) => set(() => ({ data })),
}));

export const useUserBalanceRecordsSync = (p: { pb: PocketBase }) => {
  const reactiveAuthStore = useReactiveAuthStore();
  const userBalanceRecordsStore = useUserBalanceRecordsStore();

  useEffect(() => {
    const unsubPromise = smartSubscribeToAllRecords({
      pb: p.pb,
      collectionName: userBalanceRecordsCollectionName,
      itemSchema: userBalanceRecordSchema,
      onChange: (x) => userBalanceRecordsStore.setData(x),
      onParsedItemFailedFn: (x) => console.log(`dbUserBalanceRecords.ts:${/*LL*/ 48}`, { x }),
    });

    return () => {
      unsubPromise.then((x) => x.unsubscribe());
    };
  }, [reactiveAuthStore?.record.id]);
};
