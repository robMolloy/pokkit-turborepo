import { smartSubscribeToRecordById } from "./dbRecordUtils";
import { useReactiveAuthStore } from "./reactiveAuthStore";
import PocketBase from "pocketbase";
import { useEffect } from "react";
import { create } from "zustand";
import {
  globalUserPermissionSchema,
  globalUserPermissionsCollectionName,
  type TGlobalUserPermission,
} from "./globalUserPermissionsMetadata";

type TGlobalUserPermissionStoreState = TGlobalUserPermission | null | undefined;
export const useGlobalUserPermissionStore = create<{
  data: TGlobalUserPermissionStoreState;
  setData: (x: TGlobalUserPermissionStoreState) => void;
}>()((set) => ({
  data: undefined,
  setData: (data) => set(() => ({ data })),
}));

export const smartSubscribeToGlobalUserPermissionRecord = async (p: {
  pb: PocketBase;
  userId: string;
  onChange: (x: TGlobalUserPermission | null) => void;
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
    if (!reactiveAuthStore) return globalUserPermissionStore.setData(reactiveAuthStore);

    const unsubPromise = smartSubscribeToGlobalUserPermissionRecord({
      pb: p.pb,
      userId: reactiveAuthStore.record.id,
      onChange: (x) => globalUserPermissionStore.setData(x),
    });

    return () => {
      unsubPromise.then((x) => x.unsubscribe());
    };
  }, [reactiveAuthStore?.record.id]);
};
