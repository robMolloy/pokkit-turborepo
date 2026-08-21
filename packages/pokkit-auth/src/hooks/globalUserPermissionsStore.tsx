import PocketBase from "pocketbase";
import { useEffect } from "react";
import { create } from "zustand";
import { smartSubscribeToAllRecords, TUser } from "../utils";
import {
  globalUserPermissionSchema,
  globalUserPermissionsCollectionName,
  TGlobalUserPermission,
} from "./globalUserPermissionsMetadata";
import { useReactiveAuthStore } from "./reactiveAuthStore";

type TUsersStoreState = TUser[] | undefined | null;

export const useUserRecordsStore = create<{
  data: TUsersStoreState;
  setData: (x: TUsersStoreState) => void;
}>()((set) => ({
  data: undefined,
  setData: (data) => set(() => ({ data })),
}));

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
