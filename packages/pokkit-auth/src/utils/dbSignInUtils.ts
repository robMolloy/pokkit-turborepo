import PocketBase from "pocketbase";
import { z } from "zod";
import { extractMessageFromPbError } from "./dbErrorUtils";
import { TUserSignInWithPasswordSeed, usersCollectionName } from "./dbUserUtils";
import { authStoreSchema } from "./dbAuthStoreUtils";

export const requestOtpForSignInWithOtp = async (p: { pb: PocketBase; email: string }) => {
  try {
    const resp = await p.pb.collection(usersCollectionName).requestOTP(p.email);
    const schema = z.object({ otpId: z.string() });

    const data = schema.parse(resp);
    return {
      success: true,
      data,
      messages: ["Successfully requested OTP"] as string[],
    } as const;
  } catch (error) {
    const messagesResp = extractMessageFromPbError({ error });

    const messages = ["Failed to request OTP for user", ...(messagesResp ? messagesResp : [])];

    return { success: false, error, messages } as const;
  }
};

export const signinWithOtp = async (p: {
  pb: PocketBase;
  data: { otpId: string; otp: string };
}) => {
  try {
    const data = await p.pb.collection(usersCollectionName).authWithOTP(p.data.otpId, p.data.otp);

    return {
      success: true,
      data,
      messages: ["Successfully signed in with OTP"] as string[],
    } as const;
  } catch (error) {
    const messagesResp = extractMessageFromPbError({ error });

    const messages = ["Failed to sign in with OTP", ...(messagesResp ? messagesResp : [])];

    return { success: false, error, messages } as const;
  }
};

export const signinWithPassword = async (p: {
  pb: PocketBase;
  data: TUserSignInWithPasswordSeed;
}) => {
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

export const signinWithOAuth2Google = async (p: { pb: PocketBase }) => {
  try {
    const data = await p.pb.collection(usersCollectionName).authWithOAuth2({
      provider: "google",
    });

    return {
      success: true,
      data,
      messages: ["Successfully signin user with google oauth2"] as string[],
    } as const;
  } catch (error) {
    const messagesResp = extractMessageFromPbError({ error });

    const messages = [
      "Failed to sign in user with google oauth2",
      ...(messagesResp ? messagesResp : []),
    ];

    return { success: false, error, messages } as const;
  }
};
