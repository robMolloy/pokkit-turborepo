import { PocketBase } from "@/config/pocketbaseConfig";
import {
  extractMessageFromPbError,
  smartSubscribeToAllRecords,
  useReactiveAuthStore,
} from "@repo/pokkit-auth";
import { useEffect } from "react";
import z from "zod";
import { create } from "zustand";

export const userBalanceLedgerRecordsCollectionName = "userBalanceLedger";
export const userBalanceLedgerRecordSchema = z.object({
  id: z.string(),
  userId: z.string(),
  tokenAmount: z.number(),
  reason: z.string(),
  paymentIntentId: z.string().nullish(),
  instanceId: z.string().nullish(),
  created: z.string(),
  updated: z.string(),
});
export type TUserBalanceLedgerRecord = z.infer<typeof userBalanceLedgerRecordSchema>;

export type TState = TUserBalanceLedgerRecord[] | null | undefined;
export const useUserBalanceLedgerRecordsStore = create<{
  data: TState;
  setData: (x: TState) => void;
}>()((set) => ({
  data: undefined,
  setData: (data) => set(() => ({ data })),
}));

export const smartSubscribeToAllUserBalanceLedgerRecords = async (p: {
  pb: PocketBase;
  onChange: (x: TUserBalanceLedgerRecord[]) => void;
}) => {
  return smartSubscribeToAllRecords({
    pb: p.pb,
    collectionName: userBalanceLedgerRecordsCollectionName,
    itemSchema: userBalanceLedgerRecordSchema,
    onChange: p.onChange,
    onParsedItemFailedFn: (x) => console.log(`dbUserBalanceLedgerRecords.ts:${/*LL*/ 42}`, { x }),
  });
};

export const useUserBalanceLedgerRecordsSync = (p: { pb: PocketBase }) => {
  const reactiveAuthStore = useReactiveAuthStore();
  const userBalanceLedgerRecordsStore = useUserBalanceLedgerRecordsStore();

  useEffect(() => {
    const unsubPromise = smartSubscribeToAllRecords({
      pb: p.pb,
      collectionName: userBalanceLedgerRecordsCollectionName,
      itemSchema: userBalanceLedgerRecordSchema,
      onChange: (x) => userBalanceLedgerRecordsStore.setData(x),
    });

    return () => {
      unsubPromise.then((x) => x.unsubscribe());
    };
  }, [reactiveAuthStore?.record]);
};

export const createAdminAdjustmentUserBalanceLedgerRecord = async (p: {
  pb: PocketBase;
  data: Pick<TUserBalanceLedgerRecord, "tokenAmount" | "userId">;
}) => {
  try {
    const resp = await p.pb
      .collection(userBalanceLedgerRecordsCollectionName)
      .create({ ...p.data, reason: "admin_adjustment" });
    const data = userBalanceLedgerRecordSchema.parse(resp);
    const messages = [
      "Successfully created an item in the user balance ledger",
      "The user balance will update automatically",
    ];
    return { success: true, data, messages } as const;
  } catch (error) {
    const pbMessages = extractMessageFromPbError({ error });

    const messages = [
      "Failed to create an item in the user balance ledger",
      ...(pbMessages ? pbMessages : []),
    ];
    return { success: false, error, messages } as const;
  }
};
