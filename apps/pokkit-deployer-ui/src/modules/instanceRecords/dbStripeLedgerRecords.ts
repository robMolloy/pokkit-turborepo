import { PocketBase } from "@/config/pocketbaseConfig";
import { smartSubscribeToAllRecords, useReactiveAuthStore } from "@repo/pokkit-auth";
import { useEffect } from "react";
import z from "zod";
import { create } from "zustand";

export const stripeLedgerRecordsCollectionName = "stripeLedger";
export const stripeLedgerRecordSchema = z.object({
  id: z.string(),
  userId: z.string(),
  eventType: z.string(),
  productName: z.string(),
  currency: z.string(),
  quantity: z.number(),
  amountTotal: z.number(),
  paymentIntentId: z.string().nullish(),
  invoiceId: z.string().nullish(),
  created: z.string(),
  updated: z.string(),
});
export type TStripeLedgerRecord = z.infer<typeof stripeLedgerRecordSchema>;

export type TState = TStripeLedgerRecord[] | null | undefined;
export const useStripeLedgerRecordsStore = create<{
  data: TState;
  setData: (x: TState) => void;
}>()((set) => ({
  data: undefined,
  setData: (data) => set(() => ({ data })),
}));

export const smartSubscribeToAllStripeLedgerRecords = async (p: {
  pb: PocketBase;
  onChange: (x: TStripeLedgerRecord[]) => void;
}) => {
  return smartSubscribeToAllRecords({
    pb: p.pb,
    collectionName: stripeLedgerRecordsCollectionName,
    itemSchema: stripeLedgerRecordSchema,
    onChange: p.onChange,
    onParsedItemFailedFn: (x) => console.log(`dbStripeLedgerRecords.ts:${/*LL*/ 42}`, { x }),
  });
};

export const useStripeLedgerRecordsSync = (p: { pb: PocketBase }) => {
  const reactiveAuthStore = useReactiveAuthStore();
  const stripeLedgerRecordsStore = useStripeLedgerRecordsStore();

  useEffect(() => {
    const unsubPromise = smartSubscribeToAllRecords({
      pb: p.pb,
      collectionName: stripeLedgerRecordsCollectionName,
      itemSchema: stripeLedgerRecordSchema,
      onChange: (x) => stripeLedgerRecordsStore.setData(x),
      onParsedItemFailedFn: (x) => console.log(`dbStripeLedgerRecords.ts:${/*LL*/ 52}`, { x }),
    });

    return () => {
      unsubPromise.then((x) => x.unsubscribe());
    };
  }, [reactiveAuthStore?.record]);
};

// export const createAdminAdjustmentUserBalanceLedgerRecord = async (p: {
//   pb: PocketBase;
//   data: Pick<TStripeLedgerRecord, "tokenAmount" | "userId">;
// }) => {
//   try {
//     const resp = await p.pb
//       .collection(stripeLedgerRecordsCollectionName)
//       .create({ ...p.data, reason: "admin_adjustment" });
//     const data = stripeLedgerRecordSchema.parse(resp);
//     const messages = [
//       "Successfully created an item in the user balance ledger",
//       "The user balance will update automatically",
//     ];
//     return { success: true, data, messages } as const;
//   } catch (error) {
//     const pbMessages = extractMessageFromPbError({ error });

//     const messages = [
//       "Failed to create an item in the user balance ledger",
//       ...(pbMessages ? pbMessages : []),
//     ];
//     return { success: false, error, messages } as const;
//   }
// };
