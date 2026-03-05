import PocketBase from "pocketbase";
import { z } from "zod";

const outerSchema = z.record(z.string(), z.unknown());
const innerSchema = outerSchema;
const messageObjSchema = z.object({ message: z.string() });
const errorSchema = z.object({
  message: z.string().optional(),
  response: z.object({
    data: outerSchema.transform((outerObj) => {
      const messages: string[] = [];

      Object.values(outerObj)
        .map((innerObj) => {
          const innerParsed = innerSchema.safeParse(innerObj);
          return innerParsed.success ? innerParsed.data : null;
        })
        .filter((val) => !!val)
        .map((innerObj) => {
          return Object.values(innerObj)
            .map((messageObj) => {
              const messageObjParsed = messageObjSchema.safeParse(messageObj);
              return messageObjParsed.success ? messageObjParsed.data : null;
            })
            .filter((val) => !!val);
        })
        .forEach((outerValue) => {
          outerValue.forEach((messageObj) => {
            messages.push(messageObj.message);
          });
        });

      return { messages };
    }),
  }),
});

export const extractMessageFromPbError = (p: { error: unknown }) => {
  const parsed = errorSchema.safeParse(p.error);

  if (!parsed.success) return;

  const initMessages = parsed.data.response.data.messages;
  const messageAsArray = parsed.data.message ? [parsed.data.message] : [];
  const messages = [...messageAsArray, ...initMessages];

  if (messages.length === 0) return;
  return messages;
};

const usersCollectionName = "users";
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

export const pocketbaseAuthStoreSchema = z.object({
  token: z.string(),
  record: userSchema,
});
export type TAuth = z.infer<typeof pocketbaseAuthStoreSchema>;
export type TUser = z.infer<typeof userSchema>;
type TUserSignInSeed = Pick<TUser, "email"> & { password: string };
type TUserSignUpSeed = Pick<TUser, "email" | "name" | "emailVisibility"> & {
  password: string;
  passwordConfirm: string;
};

const collectionName = "users";

export const checkAuth = (p: { pb: PocketBase }) => {
  const authStore = p.pb.authStore;
  if (!authStore?.token) return { success: false, error: "authStore is null" } as const;
  return { success: true, data: authStore } as const;
};

export const signinWithPassword = async (p: { pb: PocketBase; data: TUserSignInSeed }) => {
  try {
    const resp = await p.pb
      .collection(collectionName)
      .authWithPassword(p.data.email, p.data.password);

    pocketbaseAuthStoreSchema.parse(resp);

    return { success: true, messages: ["Successfully logged in user"] as string[] } as const;
  } catch (error) {
    const messagesResp = extractMessageFromPbError({ error });

    const messages = ["Failed to sign in user", ...(messagesResp ? messagesResp : [])];

    return { success: false, error, messages } as const;
  }
};

export const requestSigninWithOtp = async (p: { pb: PocketBase; email: string }) => {
  try {
    const resp = await p.pb.collection(collectionName).requestOTP(p.email);
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

export const requestVerificationEmail = async (p: { pb: PocketBase; email: string }) => {
  try {
    const resp = await p.pb.collection(collectionName).requestVerification(p.email);

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
    const resp = await p.pb.collection(collectionName).confirmVerification(p.token);

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
    const resp = await p.pb.collection(collectionName).requestPasswordReset(p.email);

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
      .collection(collectionName)
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

export const signinWithOtp = async (p: {
  pb: PocketBase;
  data: { otpId: string; otp: string };
}) => {
  try {
    const data = await p.pb.collection(collectionName).authWithOTP(p.data.otpId, p.data.otp);

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

export const signupWithOAuth2Google = async (p: { pb: PocketBase }) => {
  try {
    const data = await p.pb.collection(collectionName).authWithOAuth2({
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
    const data = await p.pb.collection(collectionName).authWithOAuth2({
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
    const createResp = await p.pb.collection(collectionName).create(p.data);

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
      .collection(collectionName)
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
    const data = await p.pb.collection(collectionName).listAuthMethods();
    return { success: true, data } as const;
  } catch (error) {
    const messagesResp = extractMessageFromPbError({ error });
    const messages = ["Failed to list auth methods", ...(messagesResp ? messagesResp : [])];
    return { success: false, error, messages } as const;
  }
};
