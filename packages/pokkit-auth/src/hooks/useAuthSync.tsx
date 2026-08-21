import PocketBase from "pocketbase";
import { useGlobalUserPermissionSync } from "./authGlobalUserPermissionsStore";
import { useAuthMethodsListStoreSync, useReactiveAuthStoreSync } from "./reactiveAuthStore";
import { useUserRecordsSync } from "./useUsersStore";

export const useAuthSync = (p: { pb: PocketBase }) => {
  useReactiveAuthStoreSync(p);
  useAuthMethodsListStoreSync(p);
  useGlobalUserPermissionSync(p);
  useUserRecordsSync(p);
};
