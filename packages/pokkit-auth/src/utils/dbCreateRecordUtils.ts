import PocketBase from "pocketbase";
import { extractMessageFromPbError } from "@repo/pokkit-auth";
import z from "zod";

export const createRecordHelper = async <T extends object, U extends z.ZodType>(p: {
  pb: PocketBase;
  collectionName: string;
  data: T;
  schema: U;
  successMessagesFn: (x: z.infer<U>) => string[];
  errorMessagesFn: (x: T) => string[];
}) => {
  try {
    const resp = await p.pb.collection(p.collectionName).create(p.data);

    const data = p.schema.parse(resp);
    const messages = p.successMessagesFn(data);

    return { success: true, data, messages } as const;
  } catch (error) {
    const messagesResp = extractMessageFromPbError({ error });
    const messages = [...p.errorMessagesFn(p.data), ...(messagesResp ? messagesResp : [])];

    return { success: false, error, messages } as const;
  }
};
