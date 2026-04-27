import { PocketBase } from "@/config/pocketbaseConfig";
import { smartSubscribeToAllRecords, useReactiveAuthStore } from "@repo/pokkit-auth";
import { useEffect } from "react";
import z from "zod";
import { create } from "zustand";

export const instancesSubscriptionRecordsCollectionName = "instancesSubscriptions";
export const instancesSubscriptionRecordSchema = z.object({
  id: z.string(),
  userId: z.string(),
  subscriptionId: z.string(),
  numberOfInstances: z.number(),
  created: z.string(),
  updated: z.string(),
});

export type TInstancesSubscriptionRecord = z.infer<typeof instancesSubscriptionRecordSchema>;
export type TInstancesSubscriptionRecordsStoreState =
  | TInstancesSubscriptionRecord[]
  | null
  | undefined;

export const useInstancesSubscriptionRecordsStore = create<{
  data: TInstancesSubscriptionRecordsStoreState;
  setData: (x: TInstancesSubscriptionRecordsStoreState) => void;
}>()((set) => ({
  data: undefined,
  setData: (data) => set(() => ({ data })),
}));

export const smartSubscribeToAllInstancesSubscriptionRecords = async (p: {
  pb: PocketBase;
  onChange: (x: TInstancesSubscriptionRecord[]) => void;
}) => {
  return smartSubscribeToAllRecords({
    pb: p.pb,
    collectionName: instancesSubscriptionRecordsCollectionName,
    itemSchema: instancesSubscriptionRecordSchema,
    onChange: p.onChange,
  });
};

export const useInstancesSubscriptionRecordsSync = (p: { pb: PocketBase }) => {
  const reactiveAuthStore = useReactiveAuthStore();
  const instancesSubscriptionRecordsStore = useInstancesSubscriptionRecordsStore();

  useEffect(() => {
    if (!reactiveAuthStore) {
      instancesSubscriptionRecordsStore.setData(reactiveAuthStore);
      return;
    }
    const unsubPromise = smartSubscribeToAllRecords({
      pb: p.pb,
      collectionName: instancesSubscriptionRecordsCollectionName,
      itemSchema: instancesSubscriptionRecordSchema,
      onChange: (x) => instancesSubscriptionRecordsStore.setData(x),
    });

    return () => {
      unsubPromise.then((x) => x.unsubscribe());
    };
  }, [reactiveAuthStore?.record]);
};
