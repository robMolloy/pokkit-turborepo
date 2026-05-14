import { create } from "zustand";
import {
  createRecordHelper,
  smartSubscribeToAllRecords,
  useReactiveAuthStore,
} from "@repo/pokkit-auth";
import PocketBase from "pocketbase";
import z from "zod";
import { useEffect } from "react";

const instanceRequestRecordsCollectionName = "instanceRequests";
const instanceRequestRecordSchema = z.object({
  id: z.string(),
  instancesSubscriptionId: z.string(),
  instanceNumber: z.number(),
  created: z.string(),
  updated: z.string(),
});
export type TInstanceRequestRecord = z.infer<typeof instanceRequestRecordSchema>;
type TInstanceRequestRecordsStoreState = TInstanceRequestRecord[] | null | undefined;

export const createInstanceRequestRecord = async (p1: {
  pb: PocketBase;
  data: { instancesSubscriptionId: string; instanceNumber: number };
}) =>
  createRecordHelper({
    pb: p1.pb,
    collectionName: instanceRequestRecordsCollectionName,
    data: p1.data,
    schema: instanceRequestRecordSchema,
    successMessagesFn: (x) => [`Successfully requested instance #${x.instanceNumber}`],
    errorMessagesFn: () => ["Failed to request an instance"],
  });

export const useInstanceRequestRecordsStore = create<{
  data: TInstanceRequestRecordsStoreState;
  setData: (x: TInstanceRequestRecordsStoreState) => void;
}>()((set) => ({
  data: undefined,
  setData: (data) => set(() => ({ data })),
}));

export const smartSubscribeToAllInstanceRequestRecords = async (p: {
  pb: PocketBase;
  onChange: (x: TInstanceRequestRecord[]) => void;
}) => {
  return smartSubscribeToAllRecords({
    pb: p.pb,
    collectionName: instanceRequestRecordsCollectionName,
    itemSchema: instanceRequestRecordSchema,
    onChange: p.onChange,
  });
};

export const useInstanceRequestRecordsSync = (p: { pb: PocketBase }) => {
  const reactiveAuthStore = useReactiveAuthStore();
  const instanceRequestRecordsStore = useInstanceRequestRecordsStore();

  useEffect(() => {
    if (!reactiveAuthStore) {
      instanceRequestRecordsStore.setData(reactiveAuthStore);
      return;
    }
    const unsubPromise = smartSubscribeToAllRecords({
      pb: p.pb,
      collectionName: instanceRequestRecordsCollectionName,
      itemSchema: instanceRequestRecordSchema,
      onChange: (x) => {
        instanceRequestRecordsStore.setData(x);
      },
      onParsedItemFailedFn: (x) => console.log(`dbInstanceRequestRecords.ts:${/*LL*/ 70}`, { x }),
    });

    return () => {
      unsubPromise.then((x) => x.unsubscribe());
    };
  }, [reactiveAuthStore?.record.id]);
};
