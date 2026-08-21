import PocketBase from "pocketbase";
import { useEffect } from "react";
import { create } from "zustand";
import { smartSubscribeToAllRecords } from "../lib";
import {
  globalUserPermissionSchema,
  globalUserPermissionsCollectionName,
  type TGlobalUserPermission,
} from "./globalUserPermissionsMetadata";
import { useReactiveAuthStore } from "./reactiveAuthStore";

type TGlobalUserPermissionStoreState = TGlobalUserPermission[] | null | undefined;
export const useGlobalUserPermissionsStore = create<{
  data: TGlobalUserPermissionStoreState;
  setData: (x: TGlobalUserPermissionStoreState) => void;
}>()((set) => ({
  data: undefined,
  setData: (data) => set(() => ({ data })),
}));

export const useGlobalUserPermissionsSync = (p: { pb: PocketBase }) => {
  const reactiveAuthStore = useReactiveAuthStore();
  const globalUserPermissionsStore = useGlobalUserPermissionsStore();

  useEffect(() => {
    const unsubPromise = smartSubscribeToAllRecords({
      pb: p.pb,
      collectionName: globalUserPermissionsCollectionName,
      itemSchema: globalUserPermissionSchema,
      onChange: (x) => globalUserPermissionsStore.setData(x),
    });

    return () => {
      unsubPromise.then((x) => x.unsubscribe());
    };
  }, [reactiveAuthStore?.record.id]);
};
