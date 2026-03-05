import z from "zod";
import { userSchema } from "./dbUserUtils";

export const authStoreSchema = z.object({ token: z.string(), record: userSchema });
export type TAuthStore = z.infer<typeof authStoreSchema>;
