import PocketBase from "pocketbase";
import { z } from "zod";
import { extractMessageFromPbError } from "./dbErrorUtils";
import { TUserSignUpSeed, userSchema, usersCollectionName } from "./dbUserUtils";

export const checkAuth = (p: { pb: PocketBase }) => {
  const authStore = p.pb.authStore;
  if (!authStore?.token) return { success: false, error: "authStore is null" } as const;
  return { success: true, data: authStore } as const;
};

export const requestVerificationEmail = async (p: { pb: PocketBase; email: string }) => {
  try {
    const resp = await p.pb.collection(usersCollectionName).requestVerification(p.email);

    const schema = z.literal(true);
    schema.parse(resp);

    return {
      success: true,
      messages: ["Successfully requested verification email"] as string[],
    } as const;
  } catch (error) {
    const messagesResp = extractMessageFromPbError({ error });

    const messages = [
      "Failed to request verification email for user",
      ...(messagesResp ? messagesResp : []),
    ];

    return { success: false, error, messages } as const;
  }
};

export const confirmVerificationEmail = async (p: { pb: PocketBase; token: string }) => {
  try {
    const resp = await p.pb.collection(usersCollectionName).confirmVerification(p.token);

    const schema = z.literal(true);
    schema.parse(resp);

    return {
      success: true,
      messages: ["Successfully requested verification email"] as string[],
    } as const;
  } catch (error) {
    const messagesResp = extractMessageFromPbError({ error });

    const messages = [
      "Failed to request verification email for user",
      ...(messagesResp ? messagesResp : []),
    ];

    return { success: false, error, messages } as const;
  }
};

export const requestPasswordReset = async (p: { pb: PocketBase; email: string }) => {
  try {
    const resp = await p.pb.collection(usersCollectionName).requestPasswordReset(p.email);

    const schema = z.literal(true);
    schema.parse(resp);

    return {
      success: true,
      messages: ["Successfully requested passsword reset"] as string[],
    } as const;
  } catch (error) {
    const messagesResp = extractMessageFromPbError({ error });

    const messages = [
      "Failed to request password reset for user",
      ...(messagesResp ? messagesResp : []),
    ];

    return { success: false, error, messages } as const;
  }
};

export const confirmPasswordReset = async (p: {
  pb: PocketBase;
  data: { token: string; password: string; passwordConfirm: string };
}) => {
  try {
    const resp = await p.pb
      .collection(usersCollectionName)
      .confirmPasswordReset(p.data.token, p.data.password, p.data.passwordConfirm);

    const schema = z.literal(true);
    schema.parse(resp);

    return {
      success: true,
      messages: ["Successfully confirmed passsword reset"] as string[],
    } as const;
  } catch (error) {
    const messagesResp = extractMessageFromPbError({ error });

    const messages = [
      "Failed to confirm password reset for user",
      ...(messagesResp ? messagesResp : []),
    ];

    return { success: false, error, messages } as const;
  }
};

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

export const signUpWithPassword = async (p: { pb: PocketBase; data: TUserSignUpSeed }) => {
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

export const logout = (p: { pb: PocketBase }) => {
  p.pb.realtime.unsubscribe();
  p.pb.authStore.clear();
  return { success: true } as const;
};

export const createUser = async (p: {
  pb: PocketBase;
  data: { email: string; password: string };
}) => {
  try {
    const resp = await p.pb
      .collection(usersCollectionName)
      .create({ ...p.data, passwordConfirm: p.data.password });
    return { success: true, data: resp } as const;
  } catch (error) {
    const messagesResp = extractMessageFromPbError({ error });
    const messages = ["Failed to create user", ...(messagesResp ? messagesResp : [])];
    return { success: false, error, messages } as const;
  }
};

export const listAuthMethods = async (p: { pb: PocketBase }) => {
  try {
    const data = await p.pb.collection(usersCollectionName).listAuthMethods();
    return { success: true, data } as const;
  } catch (error) {
    const messagesResp = extractMessageFromPbError({ error });
    const messages = ["Failed to list auth methods", ...(messagesResp ? messagesResp : [])];
    return { success: false, error, messages } as const;
  }
};
