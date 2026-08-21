import z from "zod";

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
export type TUserSignInWithPasswordSeed = { email: string; password: string };
export type TUserSignUpWithPasswordSeed = {
  email: string;
  name: string;
  emailVisibility: boolean;
  password: string;
  passwordConfirm: string;
};
