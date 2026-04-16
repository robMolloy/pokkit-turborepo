import z from "zod";

const envSchema = z.object({
  VITE_APP_BASE_URL: z.string(),
  VITE_POCKETBASE_URL: z.string(),
  VITE_APP_NAME: z
    .string()
    .optional()
    .transform((val) => val || "unknown-app"),
  VITE_APP_DISPLAY_NAME: z
    .string()
    .optional()
    .transform((val) => val || "Unknown App"),
  VITE_APP_STRIPE_PUBLISHABLE_KEY: z
    .string()
    .optional()
    .transform((val) => val || "Unknown stripe key"),
  VITE_APP_CONTACT_EMAIL_ADDRESS: z.string(),
});

export const envConfig = (() => {
  const parsedEnv = envSchema.safeParse(import.meta.env);

  if (!parsedEnv.success) {
    const readableMessage =
      "Invalid environment variables. Please check your .env files and ensure all required variables are set.";
    console.error(readableMessage, { error: parsedEnv.error, issues: parsedEnv.error.issues });

    throw new Error(readableMessage);
  }

  return parsedEnv.data;
})();
