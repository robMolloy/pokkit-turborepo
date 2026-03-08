import PocketBase from "pocketbase";
import { extractMessageFromPbError } from "./dbErrorUtils";
import { TUserSignUpWithPasswordSeed, userSchema, usersCollectionName } from "./dbUserUtils";
import { signUpOrSignInWithOAuth2 } from "./dbSignInUtils";

export const signInWithOAuth2 = signUpOrSignInWithOAuth2;

export const signUpWithPassword = async (p: {
  pb: PocketBase;
  data: TUserSignUpWithPasswordSeed;
}) => {
  try {
    const createResp = await p.pb.collection(usersCollectionName).create(p.data);

    userSchema.parse(createResp);

    const messages = ["Successfully signed up user"];
    return { success: true, messages } as const;
  } catch (error) {
    const messagesResp = extractMessageFromPbError({ error });

    const title = "Failed to sign up user";
    const messages = [title, ...(messagesResp ? messagesResp : [])];

    return { success: false, error, messages } as const;
  }
};
