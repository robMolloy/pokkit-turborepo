import PocketBase from "pocketbase";
import { extractMessageFromPbError } from "./dbErrorUtils";
import { TUserSignUpWithPasswordSeed, userSchema, usersCollectionName } from "./dbUserUtils";

export const signupWithOAuth2Google = async (p: { pb: PocketBase }) => {
  try {
    const data = await p.pb.collection(usersCollectionName).authWithOAuth2({
      provider: "google",
    });

    return {
      success: true,
      data,
      messages: ["Successfully signup user with google oauth2"] as string[],
    } as const;
  } catch (error) {
    const messagesResp = extractMessageFromPbError({ error });

    const messages = [
      "Failed to sign up user with google oauth2",
      ...(messagesResp ? messagesResp : []),
    ];

    return { success: false, error, messages } as const;
  }
};

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
