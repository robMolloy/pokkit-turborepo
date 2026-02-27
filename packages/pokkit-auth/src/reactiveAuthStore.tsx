import PocketBase from "pocketbase";
import { useEffect } from "react";
import { z } from "zod";
import { create } from "zustand";

const usersCollectionName = "users";
const userSchema = z.object({
  collectionId: z.string(),
  collectionName: z.literal(usersCollectionName),
  id: z.string(),
  email: z.string(),
  name: z.string(),
  emailVisibility: z.boolean(),
  verified: z.boolean(),
  created: z.string(),
  updated: z.string(),
});

const pocketBaseAuthStoreSchema = z.object({ token: z.string(), record: userSchema });
type TPocketBaseAuthStore = z.infer<typeof pocketBaseAuthStoreSchema>;

type TPocketBaseAuthStoreState = TPocketBaseAuthStore | null | undefined;

export const useReactivePocketBaseAuthStore = create<{
  data: TPocketBaseAuthStoreState;
  setData: (x: TPocketBaseAuthStoreState) => void;
}>()((set) => ({
  data: undefined,
  setData: (data) => set(() => ({ data })),
}));

export const useReactiveAuthStoreSync = (p: { pb: PocketBase }) => {
  const reactiveBaseAuthStore = useReactivePocketBaseAuthStore();
  useEffect(() => {
    if (!p.pb.authStore.isValid) return reactiveBaseAuthStore.setData(null);

    const resp = pocketBaseAuthStoreSchema.safeParse(p.pb.authStore);
    reactiveBaseAuthStore.setData(resp.success ? resp.data : null);
  }, []);

  useEffect(() => {
    p.pb.authStore.onChange(() => {
      if (!p.pb.authStore.isValid) return reactiveBaseAuthStore.setData(null);

      const resp = pocketBaseAuthStoreSchema.safeParse(p.pb.authStore);
      reactiveBaseAuthStore.setData(resp.success ? resp.data : null);
    });
  }, []);
};
