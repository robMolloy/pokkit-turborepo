import z from "zod";

const envSchema = z.object({
  VITE_POCKETBASE_URL: z.string(),
  VITE_APP_BASE_URL: z
    .string()
    .optional()
    .transform((val) => val || ""),
  VITE_APP_NAME: z
    .string()
    .optional()
    .transform((val) => val || "unknown-app"),
  VITE_APP_DISPLAY_NAME: z
    .string()
    .optional()
    .transform((val) => val || "Unknown App"),
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
