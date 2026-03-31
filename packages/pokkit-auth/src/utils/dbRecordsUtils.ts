import z from "zod";
import PocketBase from "pocketbase";

const getAllRecords = async <T extends z.ZodSchema>(p: {
  pb: PocketBase;
  collectionName: string;
  schema: T;
  onParsedItemFailedFn?: (x: unknown) => void;
  signal?: AbortSignal;
}) => {
  try {
    const resp = await p.pb.collection(p.collectionName).getFullList({ signal: p.signal });
    const validItems: z.infer<T>[] = [];
    resp.forEach((item) => {
      const parseResp = p.schema.safeParse(item);
      if (parseResp.success) validItems.push(parseResp.data);
      else p.onParsedItemFailedFn?.(item);
    });

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
  onParsedItemFailedFn?: (x: unknown) => void;
  signal?: AbortSignal;
}) => {
  try {
    const unsub = p.pb.collection(p.collectionName).subscribe(
      "*",
      (e) => {
        const parseResp = p.itemSchema.safeParse(e.record);

        if (parseResp.success)
          p.onChange({
            action: e.action as "create" | "update" | "delete",
            record: parseResp.data,
          });
        else p.onParsedItemFailedFn?.(e.record);
      },
      { signal: p.signal },
    );

    return { success: true, data: unsub } as const;
  } catch (error) {
    return { success: false, error } as const;
  }
};

export const smartSubscribeToAllRecords = async <T extends z.ZodSchema<{ id: string }>>(p: {
  pb: PocketBase;
  collectionName: string;
  itemSchema: T;
  onChange: (e: z.infer<T>[]) => void;
  onParsedItemFailedFn?: (x: unknown) => void;
}) => {
  const abortController = new AbortController();

  let allRecords: z.infer<T>[] = [];
  const getAllRecordsRespPromise = getAllRecords({
    pb: p.pb,
    collectionName: p.collectionName,
    schema: p.itemSchema,
    signal: abortController.signal,
    onParsedItemFailedFn: p.onParsedItemFailedFn,
  });

  const subscribeRespPromise = subscribeToAllRecords({
    pb: p.pb,
    collectionName: p.collectionName,
    itemSchema: p.itemSchema,
    onChange: (x) => {
      if (x.action === "create") allRecords.push(x.record);
      if (x.action === "delete") allRecords = allRecords.filter((item) => item.id !== x.record.id);
      if (x.action === "update")
        allRecords = allRecords.map((itm) => (itm.id === x.record.id ? x.record : itm));

      p.onChange([...allRecords]);
    },
    signal: abortController.signal,
    onParsedItemFailedFn: p.onParsedItemFailedFn,
  });

  const getAllRecordsResp = await getAllRecordsRespPromise;
  if (getAllRecordsResp.success) allRecords = getAllRecordsResp.data;

  p.onChange(allRecords);

  const subscribeResp = await subscribeRespPromise;

  const unsubscribe = () => {
    abortController.abort();
    subscribeResp.data?.then((unsub) => unsub());
  };

  return { ...subscribeResp, unsubscribe };
};
