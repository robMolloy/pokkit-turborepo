import { smartSubscribeToRecordById, useReactiveAuthStore } from "@repo/pokkit-auth";
import PocketBase from "pocketbase";
import { useEffect } from "react";
import z from "zod";
import { create } from "zustand";

export const globalUserPermissionsCollectionName = "authGlobalUserPermissions";

export const globalUserPermissionSchema = z.object({
  id: z.string(),
  role: z.enum(["standard", "admin"]),
  status: z.enum(["blocked", "approved", "pending"]),
  userId: z.string(),
  created: z.string(),
  updated: z.string(),
});

type TGlobalUserPermissionRecord = z.infer<typeof globalUserPermissionSchema>;

type TGlobalUserPermissionStoreState = TGlobalUserPermissionRecord | null | undefined;
export const useGlobalUserPermissionStore = create<{
  data: TGlobalUserPermissionStoreState;
  setData: (x: TGlobalUserPermissionStoreState) => void;
}>()((set) => ({
  data: undefined,
  setData: (data) => set(() => ({ data })),
}));

export const smartSubscribeToGlobalUserPermissionRecords = async (p: {
  pb: PocketBase;
  userId: string;
  onChange: (x: TGlobalUserPermissionRecord | null) => void;
}) => {
  return smartSubscribeToRecordById({
    pb: p.pb,
    id: p.userId,
    collectionName: globalUserPermissionsCollectionName,
    schema: globalUserPermissionSchema,
    onChange: p.onChange,
  });
};

export const useGlobalUserPermissionSync = (p: { pb: PocketBase }) => {
  const reactiveAuthStore = useReactiveAuthStore();
  const globalUserPermissionStore = useGlobalUserPermissionStore();

  useEffect(() => {
    if (!reactiveAuthStore) {
      globalUserPermissionStore.setData(reactiveAuthStore);
      return;
    }

    const unsubPromise = smartSubscribeToGlobalUserPermissionRecords({
      pb: p.pb,
      userId: reactiveAuthStore.record.id,
      onChange: (x) => globalUserPermissionStore.setData(x),
    });

    return () => {
      unsubPromise.then((x) => x.unsubscribe());
    };
  }, [reactiveAuthStore?.record.id]);
};
