import { PocketBase } from "@/config/pocketbaseConfig";
import { smartSubscribeToAllRecords, useReactiveAuthStore } from "@repo/pokkit-auth";
import { useEffect } from "react";
import z from "zod";
import { create } from "zustand";

export const instanceRecordsCollectionName = "instances";
export const instanceRecordSchema = z.object({
  id: z.string(),
  portNumber: z.number(),
  instanceRequestId: z.string(),
});

export type TInstanceRecord = z.infer<typeof instanceRecordSchema>;
export type TInstanceRecordsStoreState = TInstanceRecord[] | null | undefined;

export const useInstanceRecordsStore = create<{
  data: TInstanceRecordsStoreState;
  setData: (x: TInstanceRecordsStoreState) => void;
}>()((set) => ({
  data: undefined,
  setData: (data) => set(() => ({ data })),
}));

export const smartSubscribeToAllInstanceRecords = async (p: {
  pb: PocketBase;
  onChange: (x: TInstanceRecord[]) => void;
}) => {
  return smartSubscribeToAllRecords({
    pb: p.pb,
    collectionName: instanceRecordsCollectionName,
    itemSchema: instanceRecordSchema,
    onChange: p.onChange,
  });
};

export const useInstanceRecordsSync = (p: { pb: PocketBase }) => {
  const reactiveAuthStore = useReactiveAuthStore();
  const instanceRecordsStore = useInstanceRecordsStore();

  useEffect(() => {
    const unsubPromise = smartSubscribeToAllRecords({
      pb: p.pb,
      collectionName: instanceRecordsCollectionName,
      itemSchema: instanceRecordSchema,
      onChange: (x) => instanceRecordsStore.setData(x),
    });

    return () => {
      unsubPromise.then((x) => x.unsubscribe());
    };
  }, [reactiveAuthStore?.record.id]);
};
