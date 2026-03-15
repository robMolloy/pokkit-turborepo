import z from "zod";
import PocketBase from "pocketbase";

const getAllRecords = async <T extends z.ZodSchema>(p: {
  pb: PocketBase;
  collectionName: string;
  schema: T;
  signal?: AbortSignal;
}) => {
  try {
    const resp = await p.pb.collection(p.collectionName).getFullList({ signal: p.signal });
    const validItems = resp
      .map((item) => p.schema.safeParse(item))
      .filter((item) => item.success)
      .map((item) => item.data);

    return { success: true, data: validItems } as const;
  } catch (e) {
    const error = e as { message: string };
    return { success: false, error } as const;
  }
};

export const subscribeToAllRecords = async <T extends z.ZodSchema>(p: {
  pb: PocketBase;
  collectionName: string;
  itemSchema: T;
  onChange: (e: { record: z.infer<T>; action: "create" | "update" | "delete" }) => void;
  signal?: AbortSignal;
}) => {
  try {
    const unsub = p.pb.collection(p.collectionName).subscribe(
      "*",
      (e) => {
        console.log(`dbRecordsUtils.ts:${/*LL*/ 66}`, e.action);
        const parseResp = p.itemSchema.safeParse(e.record);

        if (parseResp.success && e.action === "create")
          p.onChange({ action: "create", record: parseResp.data });
      },
      { signal: p.signal },
    );

    return { success: true, data: unsub } as const;
  } catch (error) {
    return { success: false, error } as const;
  }
};

export const smartSubscribeToAllRecords = async <T extends z.ZodSchema>(p: {
  pb: PocketBase;
  collectionName: string;
  itemSchema: T;
  onChange: (e: z.infer<T>[] | null) => void;
  signal?: AbortSignal;
}) => {
  const allRecords: z.infer<T>[] = [];
  const getAllRecordsRespPromise = getAllRecords({
    pb: p.pb,
    collectionName: p.collectionName,
    schema: p.itemSchema,
    signal: p.signal,
  });

  const subscribeRespPromise = subscribeToAllRecords({
    //
    //
    //
    //
    pb: p.pb,
    collectionName: p.collectionName,
    itemSchema: p.itemSchema,
    onChange: (x) => {
      if (x.action === "create") allRecords.push(x.record);

      p.onChange(allRecords);
    },
    signal: p.signal,
  });

  const getAllRecordsResp = await getAllRecordsRespPromise;
  if (getAllRecordsResp.success) allRecords.push(...getAllRecordsResp.data);

  p.onChange(allRecords);

  const subscribeResp = await subscribeRespPromise;

  const unsubscribe = () => subscribeResp.data?.then((unsub) => unsub());

  return { ...subscribeResp, unsubscribe };
};
