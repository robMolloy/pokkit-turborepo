import PocketBase from "pocketbase";
import { z } from "zod";
import { extractMessageFromPbError } from "./dbErrorUtils";
import { usersCollectionName } from "./dbUserUtils";

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

export const logout = (p: { pb: PocketBase }) => {
  p.pb.realtime.unsubscribe();
  p.pb.authStore.clear();
  return { success: true } as const;
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
