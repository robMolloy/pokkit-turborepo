import PocketBase from "pocketbase";
import { useGlobalUserPermissionSync } from "./globalUserPermissionStore";
import { useAuthMethodsListStoreSync, useReactiveAuthStoreSync } from "./reactiveAuthStore";
import { useUserRecordsSync } from "./useUsersStore";
import { useGlobalUserPermissionsSync } from "./globalUserPermissionsStore";

export const useAuthSync = (p: { pb: PocketBase }) => {
  useReactiveAuthStoreSync(p);
  useAuthMethodsListStoreSync(p);
  useGlobalUserPermissionSync(p);
  useGlobalUserPermissionsSync(p);
  useUserRecordsSync(p);
};
