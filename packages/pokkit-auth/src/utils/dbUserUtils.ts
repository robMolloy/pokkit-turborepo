import z from "zod";
import { authStoreSchema } from "./dbAuthStoreUtils";
import PocketBase from "pocketbase";
import { extractMessageFromPbError } from "./dbErrorUtils";

export const usersCollectionName = "users";
export const userSchema = z.object({
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

export type TUser = z.infer<typeof userSchema>;
export type TUserSignInSeed = Pick<TUser, "email"> & { password: string };
export type TUserSignUpSeed = Pick<TUser, "email" | "name" | "emailVisibility"> & {
  password: string;
  passwordConfirm: string;
};

export const signinWithPassword = async (p: { pb: PocketBase; data: TUserSignInSeed }) => {
  try {
    const resp = await p.pb
      .collection(usersCollectionName)
      .authWithPassword(p.data.email, p.data.password);

    authStoreSchema.parse(resp);

    return { success: true, messages: ["Successfully logged in user"] as string[] } as const;
  } catch (error) {
    const messagesResp = extractMessageFromPbError({ error });

    const messages = ["Failed to sign in user", ...(messagesResp ? messagesResp : [])];

    return { success: false, error, messages } as const;
  }
};
